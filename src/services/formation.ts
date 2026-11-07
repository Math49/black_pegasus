import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import type { DemandeFormation } from "@/domaine/formation";
import { ErreurMetier } from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";

export const lirePermisPublics = cache(async () => {
  await connection();
  return prisma.permis.findMany({
    where: { visible: true, supprimeLe: null },
    include: { domaine: true },
    orderBy: [{ ordre: "asc" }, { nom: "asc" }],
  });
});

export async function lireFormationAdmin() {
  await connection();
  const [domaines, permis] = await Promise.all([
    prisma.domainePermis.findMany({
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
      include: { _count: { select: { permis: true } } },
    }),
    prisma.permis.findMany({
      where: { supprimeLe: null },
      include: { domaine: true },
      orderBy: [{ domaine: { ordre: "asc" } }, { ordre: "asc" }, { nom: "asc" }],
    }),
  ]);
  return { domaines, permis };
}

async function ecrire(
  acteur: CompteConnecte,
  action: string,
  cible: string,
  travail: (tx: Tx) => Promise<void>,
) {
  await enTransaction(async (tx) => {
    await travail(tx);
    await journaliser(tx, { compteId: acteur.id, action, cible });
  });
  revalidatePath("/formation");
  revalidatePath("/admin", "layout");
}

export function enregistrerDomaine(
  acteur: CompteConnecte,
  id: string | null,
  donnees: { nom: string; ordre: number },
) {
  return ecrire(
    acteur,
    "formation.domaine",
    id ? `DomainePermis:${id}` : "DomainePermis",
    async (tx) => {
      const doublon = await tx.domainePermis.findFirst({
        where: {
          nom: { equals: donnees.nom, mode: "insensitive" },
          ...(id && { id: { not: id } }),
        },
      });
      if (doublon) throw new ErreurMetier("Un domaine porte déjà ce nom.");
      if (id) {
        if (!(await tx.domainePermis.findUnique({ where: { id } })))
          throw new ErreurMetier("Domaine introuvable.");
        await tx.domainePermis.update({ where: { id }, data: donnees });
      } else await tx.domainePermis.create({ data: donnees });
    },
  );
}

export function supprimerDomaine(acteur: CompteConnecte, id: string) {
  return ecrire(acteur, "formation.domaine.supprimer", `DomainePermis:${id}`, async (tx) => {
    const domaine = await tx.domainePermis.findUnique({
      where: { id },
      include: { _count: { select: { permis: true } } },
    });
    if (!domaine) throw new ErreurMetier("Domaine introuvable.");
    if (domaine._count.permis > 0)
      throw new ErreurMetier("Ce domaine est utilisé par un permis : suppression impossible.");
    await tx.domainePermis.delete({ where: { id } });
  });
}

export type DonneesPermis = {
  domaineId: string;
  nom: string;
  description: string;
  prerequis: string;
  duree: string;
  epreuves: string;
  prix: number;
  ordre: number;
  visible: boolean;
};

export function enregistrerPermis(
  acteur: CompteConnecte,
  id: string | null,
  donnees: DonneesPermis,
) {
  return ecrire(acteur, "formation.permis", id ? `Permis:${id}` : "Permis", async (tx) => {
    if (!(await tx.domainePermis.findUnique({ where: { id: donnees.domaineId } })))
      throw new ErreurMetier("Domaine introuvable.");
    if (id) {
      if (!(await tx.permis.findFirst({ where: { id, supprimeLe: null } })))
        throw new ErreurMetier("Permis introuvable.");
      await tx.permis.update({ where: { id }, data: donnees });
    } else await tx.permis.create({ data: donnees });
  });
}

export async function supprimerPermis(acteur: CompteConnecte, id: string) {
  const instant = await maintenant();
  return ecrire(acteur, "formation.permis.supprimer", `Permis:${id}`, async (tx) => {
    if (!(await tx.permis.findFirst({ where: { id, supprimeLe: null } })))
      throw new ErreurMetier("Permis introuvable.");
    await tx.permis.update({ where: { id }, data: { supprimeLe: instant, visible: false } });
  });
}

/** Action publique : l’IP sert au limiteur en mémoire, jamais aux données conservées. */
export async function recevoirDemande(donnees: DemandeFormation) {
  const instant = await maintenant();
  await enTransaction(async (tx) => {
    const filiale = await tx.filiale.findUnique({ where: { code: "BPF" } });
    if (!filiale?.visible) throw new ErreurMetier("Le formulaire de Formation est indisponible.");
    if (
      donnees.permisId &&
      !(await tx.permis.findFirst({
        where: { id: donnees.permisId, visible: true, supprimeLe: null },
      }))
    )
      throw new ErreurMetier(
        "Ce permis n’est plus proposé. Choisissez un autre permis ou une demande générale.",
      );
    const demande = await tx.demandeContact.create({ data: { ...donnees, creeLe: instant } });
    // L’audit public ne recopie ni message, ni coordonnées.
    await journaliser(tx, {
      compteId: null,
      action: "formation.demande",
      cible: `DemandeContact:${demande.id}`,
    });
  });
  revalidatePath("/admin", "layout");
}

export async function lireDemandes(toutes: boolean, page = 1) {
  await connection();
  const where = toutes ? {} : { statut: "NOUVELLE" as const };
  const total = await prisma.demandeContact.count({ where });
  const pageCourante = Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / 30)));
  const demandes = await prisma.demandeContact.findMany({
    where,
    orderBy: [{ creeLe: "desc" }, { id: "desc" }],
    skip: (pageCourante - 1) * 30,
    take: 30,
    include: {
      permis: { select: { nom: true } },
      traiteePar: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
    },
  });
  return { demandes, total, pageCourante };
}

export async function traiterDemande(acteur: CompteConnecte, id: string) {
  const instant = await maintenant();
  await enTransaction(async (tx) => {
    const demande = await tx.demandeContact.findUnique({ where: { id } });
    if (!demande) throw new ErreurMetier("Demande introuvable.");
    if (demande.statut === "TRAITEE") return;
    await tx.demandeContact.update({
      where: { id },
      data: { statut: "TRAITEE", traiteeLe: instant, traiteeParId: acteur.id },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "formation.demande.traiter",
      cible: `DemandeContact:${id}`,
    });
  });
  revalidatePath("/admin", "layout");
}
