import "server-only";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import {
  etatEnchere,
  finInitiale,
  meilleureOffre,
  nouvelleFin,
  verifierOffre,
  verifierParametresEnchere,
  type ParametresEnchere,
} from "@/domaine/encheres";
import { ErreurMetier } from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";
import { vendreTx } from "./cards";

// Enchères de cartes (REFONTE-ADMIN § 5) : transactions, verrous et journal.

function revaliderEncheres(id?: string) {
  revalidatePath("/cards");
  if (id) revalidatePath(`/cards/encheres/${id}`);
  revalidatePath("/admin", "layout");
}

const OFFRES_PUBLIQUES = {
  orderBy: [{ date: "desc" as const }, { montant: "desc" as const }],
  // Jamais le nom ni le téléphone hors du panel.
  select: { id: true, montant: true, date: true, invalidee: true },
};

// ── Lectures ────────────────────────────────────────────────────────────────

/** Enchères ouvertes par carte (liste du site et du panel) : fin et offres retenues. */
export async function lireEncheresOuvertes() {
  await connection();
  const encheres = await prisma.enchere.findMany({
    where: { statut: "OUVERTE" },
    include: {
      offres: {
        where: { invalidee: false },
        select: { montant: true, date: true, invalidee: true },
      },
    },
  });
  return new Map(encheres.map((e) => [e.carteId, e]));
}

/** Page publique : carte visible, enchère ouverte ou conclue ; offres sans nom. */
export async function lireEncherePublique(id: string) {
  await connection();
  return prisma.enchere.findFirst({
    where: {
      id,
      statut: { in: ["OUVERTE", "CONCLUE"] },
      carte: { visible: true, supprimeLe: null },
    },
    include: {
      carte: { include: { categorie: true } },
      offres: { ...OFFRES_PUBLIQUES, where: { invalidee: false } },
    },
  });
}

/** Panel : enchère complète, offres avec nom et téléphone. */
export async function lireEnchereAdmin(id: string) {
  await connection();
  return prisma.enchere.findUnique({
    where: { id },
    include: {
      carte: { include: { categorie: true } },
      offres: {
        orderBy: [{ date: "desc" }, { montant: "desc" }],
        include: {
          ecarteePar: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
        },
      },
      vente: { select: { numero: true } },
      creePar: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
    },
  });
}

/** Cloche et tableau de bord : enchères à conclure et offres reçues depuis un instant. */
export async function lireActiviteEncheres(depuis: Date) {
  const instant = await maintenant();
  const [ouvertes, offresRecentes] = await Promise.all([
    prisma.enchere.findMany({
      where: { statut: "OUVERTE" },
      select: {
        id: true,
        finPrevue: true,
        statut: true,
        carte: { select: { nom: true } },
        offres: { select: { montant: true, date: true, invalidee: true } },
      },
      orderBy: { finPrevue: "asc" },
    }),
    prisma.offreEnchere.count({ where: { date: { gte: depuis }, invalidee: false } }),
  ]);
  return {
    instant,
    ouvertes: ouvertes.map((e) => ({ ...e, etat: etatEnchere(e, e.offres, instant) })),
    offresRecentes,
  };
}

// ── Écritures ───────────────────────────────────────────────────────────────

/** Ouvre une enchère sur une carte (dans la transaction de l'enregistrement de la carte). */
export async function ouvrirEnchereTx(
  tx: Tx,
  acteur: CompteConnecte,
  carteId: string,
  p: ParametresEnchere,
  instant: Date,
) {
  verifierParametresEnchere(p);
  const carte = await tx.carte.findUniqueOrThrow({ where: { id: carteId } });
  if (carte.stock < 1)
    throw new ErreurMetier("Une enchère porte sur un exemplaire : ajoutez du stock d’abord.");
  if (await tx.enchere.count({ where: { carteId, statut: "OUVERTE" } }))
    throw new ErreurMetier("Cette carte a déjà une enchère en cours.");
  const e = await tx.enchere.create({
    data: {
      carteId,
      ...p,
      debut: instant,
      finPrevue: finInitiale(instant, p.dureeHeures),
      creeParId: acteur.id,
    },
  });
  await journaliser(tx, {
    compteId: acteur.id,
    action: "enchere.ouvrir",
    cible: `Enchere:${e.id}`,
    details: { carte: carte.nom, ...p },
  });
  return e;
}

/** Verrou sur l'enchère : les offres et décisions simultanées s'excluent. */
async function verrouiller(tx: Tx, id: string) {
  await tx.$queryRaw`SELECT id FROM "Enchere" WHERE id = ${id} FOR UPDATE`;
  const e = await tx.enchere.findUnique({
    where: { id },
    include: { carte: true, offres: true },
  });
  if (!e) throw new ErreurMetier("Enchère introuvable.");
  return e;
}

/**
 * Offre publique (sans session) : contrôle du minimum, prolongation éventuelle. Le journal
 * ne garde que le montant, jamais les coordonnées.
 */
export async function deposerOffre(
  enchereId: string,
  o: { nom: string; telephone: string; montant: number },
) {
  const instant = await maintenant();
  const r = await enTransaction(async (tx) => {
    const e = await verrouiller(tx, enchereId);
    if (!e.carte.visible || e.carte.supprimeLe) throw new ErreurMetier("Enchère introuvable.");
    verifierOffre(e, e.offres, o.montant, instant);
    await tx.offreEnchere.create({
      data: { enchereId, montant: o.montant, nom: o.nom, telephone: o.telephone, date: instant },
    });
    const fin = nouvelleFin(e.finPrevue, instant, e.tempsAdditionnelMin);
    if (fin.getTime() !== e.finPrevue.getTime())
      await tx.enchere.update({ where: { id: enchereId }, data: { finPrevue: fin } });
    await journaliser(tx, {
      compteId: null,
      action: "enchere.offre",
      cible: `Enchere:${enchereId}`,
      details: { carte: e.carte.nom, montant: o.montant, prolongee: fin > e.finPrevue },
    });
    return { finPrevue: fin };
  });
  revaliderEncheres(enchereId);
  return r;
}

/** Conclusion : vente au montant de l'offre gagnante, à son auteur ; stock décrémenté. */
export async function conclureEnchere(acteur: CompteConnecte, id: string) {
  const instant = await maintenant();
  const vente = await enTransaction(async (tx) => {
    const e = await verrouiller(tx, id);
    if (etatEnchere(e, e.offres, instant) !== "a_conclure")
      throw new ErreurMetier("Seule une enchère terminée avec une offre peut être conclue.");
    const gagnante = meilleureOffre(e.offres)!;
    const v = await vendreTx(
      tx,
      acteur,
      {
        lignes: [{ carteId: e.carteId, quantite: 1 }],
        montantEncaisse: null,
        clientNom: gagnante.nom,
        clientTelephone: gagnante.telephone,
      },
      instant,
      { prixImposes: new Map([[e.carteId, gagnante.montant]]), enchereId: e.id },
    );
    await tx.enchere.update({ where: { id }, data: { statut: "CONCLUE", venteId: v.id } });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "enchere.conclure",
      cible: `Enchere:${id}`,
      details: { carte: e.carte.nom, montant: gagnante.montant, vente: v.numero },
    });
    return v;
  });
  revaliderEncheres(id);
  return vente;
}

/**
 * Écarte une offre. « fantaisiste » : administrateur, à tout moment de l'enchère ouverte.
 * « defaillant » : le gagnant ne paie pas, on passe à l'enchérisseur suivant.
 */
export async function ecarterOffre(
  acteur: CompteConnecte,
  offreId: string,
  motif: "fantaisiste" | "defaillant",
) {
  const instant = await maintenant();
  const enchereId = await enTransaction(async (tx) => {
    const o = await tx.offreEnchere.findUnique({ where: { id: offreId } });
    if (!o) throw new ErreurMetier("Offre introuvable.");
    const e = await verrouiller(tx, o.enchereId);
    if (e.statut !== "OUVERTE") throw new ErreurMetier("Cette enchère n’est plus ouverte.");
    if (o.invalidee) throw new ErreurMetier("Cette offre est déjà écartée.");
    if (motif === "defaillant") {
      if (etatEnchere(e, e.offres, instant) !== "a_conclure")
        throw new ErreurMetier("On ne passe au suivant qu’une fois l’enchère terminée.");
      if (meilleureOffre(e.offres)?.id !== o.id)
        throw new ErreurMetier("Seule l’offre gagnante peut être déclarée défaillante.");
    }
    await tx.offreEnchere.update({
      where: { id: offreId },
      data: { invalidee: true, motifEcart: motif, ecarteeParId: acteur.id },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: motif === "defaillant" ? "enchere.suivant" : "enchere.ecarter",
      cible: `Enchere:${e.id}`,
      details: { carte: e.carte.nom, montant: o.montant },
    });
    return e.id;
  });
  revaliderEncheres(enchereId);
}

/** Annule l'enchère : la carte repasse en vente classique. */
export async function annulerEnchere(acteur: CompteConnecte, id: string) {
  await enTransaction(async (tx) => {
    const e = await verrouiller(tx, id);
    if (e.statut !== "OUVERTE") throw new ErreurMetier("Cette enchère n’est plus ouverte.");
    await tx.enchere.update({ where: { id }, data: { statut: "ANNULEE" } });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "enchere.annuler",
      cible: `Enchere:${id}`,
      details: { carte: e.carte.nom, offres: e.offres.filter((x) => !x.invalidee).length },
    });
  });
  revaliderEncheres(id);
}

/** Relance une enchère terminée sans offre : nouvelle durée à partir de maintenant. */
export async function relancerEnchere(acteur: CompteConnecte, id: string) {
  const instant = await maintenant();
  await enTransaction(async (tx) => {
    const e = await verrouiller(tx, id);
    if (etatEnchere(e, e.offres, instant) !== "sans_offre")
      throw new ErreurMetier("Seule une enchère terminée sans offre peut être relancée.");
    await tx.enchere.update({
      where: { id },
      data: { debut: instant, finPrevue: finInitiale(instant, e.dureeHeures) },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "enchere.relancer",
      cible: `Enchere:${id}`,
      details: { carte: e.carte.nom, dureeHeures: e.dureeHeures },
    });
  });
  revaliderEncheres(id);
}
