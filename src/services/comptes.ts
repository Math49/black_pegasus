import "server-only";
import { estIdentifiantDiscord, nomCompte, normaliserNomRp } from "@/domaine/comptes";
import { verifierModificationCompte } from "@/domaine/permissions";
import { ErreurMetier, type Role } from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { enTransaction } from "@/lib/transaction";
import { journaliser } from "./audit";
import { rechercherProfilDiscord, type ProfilDiscord } from "./discord";

export type VerificationIdentifiant =
  | { statut: "invalide" }
  | { statut: "existant"; nom: string }
  | { statut: "trouve"; profil: ProfilDiscord }
  | { statut: "introuvable" }
  | { statut: "non-verifie" };

/** Bouton « Vérifier » de la modale d'ajout. */
export async function verifierIdentifiant(discordId: string): Promise<VerificationIdentifiant> {
  const id = discordId.trim();
  if (!estIdentifiantDiscord(id)) return { statut: "invalide" };
  const existant = await prisma.compte.findUnique({ where: { discordId: id } });
  if (existant) return { statut: "existant", nom: nomCompte(existant) };
  const profil = await rechercherProfilDiscord(id);
  if (profil === "introuvable") return { statut: "introuvable" };
  if (profil === "indisponible") return { statut: "non-verifie" };
  return { statut: "trouve", profil };
}

export async function ajouterCompte(
  acteur: CompteConnecte,
  discordId: string,
  role: Role,
  nomRp = "",
) {
  const id = discordId.trim();
  const rp = normaliserNomRp(nomRp);
  if (!estIdentifiantDiscord(id))
    throw new ErreurMetier("Identifiant Discord invalide (17 à 20 chiffres).");
  const profil = await rechercherProfilDiscord(id);
  if (profil === "introuvable")
    throw new ErreurMetier("Aucun compte Discord ne porte cet identifiant.");
  const connu = typeof profil === "object" ? profil : null;

  return enTransaction(async (tx) => {
    if (await tx.compte.findUnique({ where: { discordId: id } })) {
      throw new ErreurMetier("Ce compte Discord est déjà autorisé.");
    }
    const compte = await tx.compte.create({
      data: {
        discordId: id,
        role,
        pseudo: connu?.pseudo ?? "",
        nomAffiche: connu?.nom ?? "",
        nomRp: rp,
        avatarUrl: connu?.avatarUrl ?? null,
        ajouteParId: acteur.id,
      },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "compte.ajouter",
      cible: `Compte:${id}`,
      details: { role, nom: nomCompte(compte) },
    });
    return compte;
  });
}

export async function modifierCompte(
  acteur: CompteConnecte,
  compteId: string,
  modification: { role?: Role; actif?: boolean; nomRp?: string },
) {
  const nomRp = modification.nomRp === undefined ? undefined : normaliserNomRp(modification.nomRp);
  await enTransaction(async (tx) => {
    const cible = await tx.compte.findUnique({ where: { id: compteId } });
    if (!cible) throw new ErreurMetier("Compte introuvable.");
    const adminsActifs = await tx.compte.count({ where: { role: "ADMIN", actif: true } });
    verifierModificationCompte({ acteur, cible, modification, adminsActifs });

    const changeRole = modification.role !== undefined && modification.role !== cible.role;
    const changeActif = modification.actif !== undefined && modification.actif !== cible.actif;
    const changeNom = nomRp !== undefined && nomRp !== cible.nomRp;
    if (!changeRole && !changeActif && !changeNom) return;

    await tx.compte.update({
      where: { id: compteId },
      data: {
        ...(changeRole && { role: modification.role }),
        ...(changeActif && { actif: modification.actif }),
        ...(changeNom && { nomRp }),
      },
    });
    // Un compte désactivé perd aussitôt ses sessions ouvertes.
    if (changeActif && !modification.actif && cible.userId) {
      await tx.session.deleteMany({ where: { userId: cible.userId } });
    }
    const cibleJournal = `Compte:${cible.discordId}`;
    if (changeRole) {
      await journaliser(tx, {
        compteId: acteur.id,
        action: "compte.role",
        cible: cibleJournal,
        details: { nom: nomCompte(cible), avant: cible.role, apres: modification.role! },
      });
    }
    if (changeNom) {
      await journaliser(tx, {
        compteId: acteur.id,
        action: "compte.nom",
        cible: cibleJournal,
        details: { avant: nomCompte(cible), apres: nomCompte({ ...cible, nomRp }) },
      });
    }
    if (changeActif) {
      await journaliser(tx, {
        compteId: acteur.id,
        action: modification.actif ? "compte.activer" : "compte.desactiver",
        cible: cibleJournal,
        details: { nom: nomCompte(cible) },
      });
    }
  });
}

export const TAILLE_PAGE_JOURNAL = 15;

export async function lireComptes() {
  return prisma.compte.findMany({
    include: {
      ajoutePar: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
    },
    orderBy: [{ actif: "desc" }, { ajouteLe: "asc" }],
  });
}

export async function lireJournal(page: number) {
  const [total, lignes] = await Promise.all([
    prisma.journalAudit.count(),
    prisma.journalAudit.findMany({
      include: {
        compte: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * TAILLE_PAGE_JOURNAL,
      take: TAILLE_PAGE_JOURNAL,
    }),
  ]);
  return { total, pages: Math.max(1, Math.ceil(total / TAILLE_PAGE_JOURNAL)), lignes };
}
