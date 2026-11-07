import "server-only";
import { TZDate } from "@date-fns/tz";
import { cache } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { montantVente, motifVente, verifierStock } from "@/domaine/cards";
import { preparerContrePassation } from "@/domaine/comptabilite";
import { cleCompteurVentes, numeroVente } from "@/domaine/numerotation";
import { ErreurMetier } from "@/domaine/types";
import type { ImageEnvoyee } from "@/lib/fichiers";
import type { CompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";
import { inscrireMouvement, lireRegles } from "./mouvements";
import { enregistrerFichier, supprimerFichier } from "./stockage";

function revaliderCards() {
  revalidatePath("/cards");
  revalidatePath("/");
  revalidatePath("/admin", "layout");
}

// ── Lectures ────────────────────────────────────────────────────────────────

/** Cartes affichées sur le site : visibles, non retirées, catégorie incluse. */
export const lireCartesPubliques = cache(async () => {
  await connection();
  return prisma.carte.findMany({
    where: { visible: true, supprimeLe: null },
    include: { categorie: true },
    orderBy: [{ categorie: { ordre: "asc" } }, { ordre: "asc" }, { nom: "asc" }],
  });
});

export async function lireCardsAdmin() {
  await connection();
  const [categories, cartes] = await Promise.all([
    prisma.categorieCarte.findMany({
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
      include: { _count: { select: { cartes: true } } },
    }),
    prisma.carte.findMany({
      where: { supprimeLe: null },
      include: { categorie: true },
      orderBy: [{ categorie: { ordre: "asc" } }, { ordre: "asc" }, { nom: "asc" }],
    }),
  ]);
  return { categories, cartes };
}

export const TAILLE_PAGE_VENTES = 30;

/** Ventes, les plus récentes d'abord ; `q` filtre sur le n°, la carte ou le client. */
export async function lireVentes(page = 1, q = "") {
  await connection();
  const recherche = q.trim();
  const where = recherche
    ? {
        OR: (["numero", "carteNom", "clientNom"] as const).map((champ) => ({
          [champ]: { contains: recherche, mode: "insensitive" as const },
        })),
      }
    : {};
  const total = await prisma.venteCarte.count({ where });
  const pageCourante = Math.min(
    Math.max(1, page),
    Math.max(1, Math.ceil(total / TAILLE_PAGE_VENTES)),
  );
  const ventes = await prisma.venteCarte.findMany({
    where,
    orderBy: [{ date: "desc" }, { numero: "desc" }],
    skip: (pageCourante - 1) * TAILLE_PAGE_VENTES,
    take: TAILLE_PAGE_VENTES,
    include: {
      saisiePar: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
      mouvements: { select: { semaine: { select: { statut: true } } } },
    },
  });
  return { ventes, total, pageCourante };
}

/** Cartes proposées dans la modale « Nouvelle vente » (en stock ou non, non retirées). */
export async function lireCartesVendables() {
  return prisma.carte.findMany({
    where: { supprimeLe: null },
    select: { id: true, nom: true, prix: true, stock: true, categorie: { select: { nom: true } } },
    orderBy: [{ categorie: { ordre: "asc" } }, { ordre: "asc" }, { nom: "asc" }],
  });
}

// ── Catalogue ───────────────────────────────────────────────────────────────

async function ecrire<T>(
  acteur: CompteConnecte,
  action: string,
  cible: string,
  travail: (tx: Tx) => Promise<{ details?: Record<string, string | number | null>; valeur: T }>,
) {
  const valeur = await enTransaction(async (tx) => {
    const r = await travail(tx);
    await journaliser(tx, { compteId: acteur.id, action, cible, details: r.details });
    return r.valeur;
  });
  revaliderCards();
  return valeur;
}

export function enregistrerCategorie(
  acteur: CompteConnecte,
  id: string | null,
  donnees: { nom: string; ordre: number },
) {
  return ecrire(
    acteur,
    "cards.categorie",
    id ? `CategorieCarte:${id}` : "CategorieCarte",
    async (tx) => {
      const doublon = await tx.categorieCarte.findFirst({
        where: {
          nom: { equals: donnees.nom, mode: "insensitive" },
          ...(id && { id: { not: id } }),
        },
      });
      if (doublon) throw new ErreurMetier("Une catégorie porte déjà ce nom.");
      if (id) {
        if (!(await tx.categorieCarte.findUnique({ where: { id } })))
          throw new ErreurMetier("Catégorie introuvable.");
        await tx.categorieCarte.update({ where: { id }, data: donnees });
      } else await tx.categorieCarte.create({ data: donnees });
      return { details: { nom: donnees.nom }, valeur: undefined };
    },
  );
}

export function supprimerCategorie(acteur: CompteConnecte, id: string) {
  return ecrire(acteur, "cards.categorie.supprimer", `CategorieCarte:${id}`, async (tx) => {
    const c = await tx.categorieCarte.findUnique({
      where: { id },
      include: { _count: { select: { cartes: true } } },
    });
    if (!c) throw new ErreurMetier("Catégorie introuvable.");
    if (c._count.cartes > 0)
      throw new ErreurMetier("Cette catégorie contient des cartes : suppression impossible.");
    await tx.categorieCarte.delete({ where: { id } });
    return { details: { nom: c.nom }, valeur: undefined };
  });
}

export type DonneesCarte = {
  categorieId: string;
  nom: string;
  prix: number;
  stock: number;
  ordre: number;
  visible: boolean;
};

/**
 * Crée ou modifie une carte. `photo` : nouvelle image, `null` pour revenir au visuel par
 * défaut, `undefined` pour garder la photo actuelle. Une correction du stock est journalisée.
 */
export async function enregistrerCarte(
  acteur: CompteConnecte,
  id: string | null,
  donnees: DonneesCarte,
  photo: ImageEnvoyee | null | undefined,
) {
  const cle = photo ? await enregistrerFichier("photos", photo.octets, photo.extension) : null;
  let ancienne: string | null = null;
  try {
    await ecrire(acteur, "cards.carte", id ? `Carte:${id}` : "Carte", async (tx) => {
      if (!(await tx.categorieCarte.findUnique({ where: { id: donnees.categorieId } })))
        throw new ErreurMetier("Catégorie introuvable.");
      const data = { ...donnees, ...(photo !== undefined && { photo: cle }) };
      if (!id) {
        const cree = await tx.carte.create({ data });
        return { details: { nom: cree.nom, stock: cree.stock }, valeur: undefined };
      }
      // Verrou : une vente simultanée ne peut pas croiser une correction du stock.
      await tx.$queryRaw`SELECT id FROM "Carte" WHERE id = ${id} FOR UPDATE`;
      const avant = await tx.carte.findFirst({ where: { id, supprimeLe: null } });
      if (!avant) throw new ErreurMetier("Carte introuvable.");
      if (photo !== undefined) ancienne = avant.photo;
      await tx.carte.update({ where: { id }, data });
      if (avant.stock !== donnees.stock)
        await journaliser(tx, {
          compteId: acteur.id,
          action: "cards.stock",
          cible: `Carte:${id}`,
          details: { carte: donnees.nom, avant: avant.stock, apres: donnees.stock },
        });
      return { details: { nom: donnees.nom, stock: donnees.stock }, valeur: undefined };
    });
  } catch (e) {
    if (cle) await supprimerFichier(cle);
    throw e;
  }
  if (ancienne && ancienne !== cle) await supprimerFichier(ancienne);
}

/** Retrait logique : la carte disparaît du site et du panel, ses ventes restent lisibles. */
export async function supprimerCarte(acteur: CompteConnecte, id: string) {
  const instant = await maintenant();
  return ecrire(acteur, "cards.carte.supprimer", `Carte:${id}`, async (tx) => {
    const c = await tx.carte.findFirst({ where: { id, supprimeLe: null } });
    if (!c) throw new ErreurMetier("Carte introuvable.");
    await tx.carte.update({ where: { id }, data: { supprimeLe: instant, visible: false } });
    return { details: { nom: c.nom }, valeur: undefined };
  });
}

// ── Ventes ──────────────────────────────────────────────────────────────────

export type DonneesVente = {
  carteId: string;
  quantite: number;
  clientNom: string;
  clientTelephone: string | null;
};

/** Verrou sur la carte, contrôle du stock, numéro BPC, recette inscrite au registre. */
export async function creerVente(acteur: CompteConnecte, d: DonneesVente) {
  const instant = await maintenant();
  const vente = await enTransaction(async (tx) => {
    // Deux ventes simultanées du dernier exemplaire s'excluent.
    const verrou = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Carte" WHERE id = ${d.carteId} AND "supprimeLe" IS NULL FOR UPDATE`;
    if (verrou.length === 0) throw new ErreurMetier("Carte introuvable.");
    const carte = await tx.carte.findUniqueOrThrow({ where: { id: d.carteId } });
    const restant = verifierStock(carte.stock, d.quantite);
    // Le montant est toujours recalculé ici, jamais repris du navigateur.
    const montant = montantVente(carte.prix, d.quantite);
    if (montant <= 0) throw new ErreurMetier("Cette carte n’a pas de prix : vente impossible.");

    const regles = await lireRegles(tx);
    const annee = new TZDate(instant.getTime(), regles.fuseau).getFullYear();
    const compteur = await tx.compteur.upsert({
      where: { cle: cleCompteurVentes(annee) },
      create: { cle: cleCompteurVentes(annee), valeur: 1 },
      update: { valeur: { increment: 1 } },
    });
    const clientNom = d.clientNom.trim();
    const cree = await tx.venteCarte.create({
      data: {
        numero: numeroVente(annee, compteur.valeur),
        carteId: carte.id,
        carteNom: carte.nom,
        prixUnitaire: carte.prix,
        quantite: d.quantite,
        montant,
        clientNom,
        clientTelephone: d.clientTelephone?.trim() || null,
        date: instant,
        saisieParId: acteur.id,
      },
    });
    await tx.carte.update({ where: { id: carte.id }, data: { stock: restant } });
    const mouvement = await inscrireMouvement(
      tx,
      {
        date: instant,
        sens: "ENTREE",
        categorie: "VENTE_CARTES",
        montant,
        motif: motifVente({ carteNom: carte.nom, quantite: d.quantite, clientNom }),
        automatique: true,
        filiale: "BPC",
        saisiParId: acteur.id,
      },
      regles.fuseau,
    );
    await tx.mouvement.update({ where: { id: mouvement.id }, data: { venteCarteId: cree.id } });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "vente.creer",
      cible: `VenteCarte:${cree.numero}`,
      details: { carte: carte.nom, quantite: d.quantite, montant, client: clientNom },
    });
    return cree;
  });
  revaliderCards();
  return vente;
}

/** Annulation (administrateur) : contre-passation de la recette et stock rendu. */
export async function annulerVente(acteur: CompteConnecte, venteId: string) {
  const instant = await maintenant();
  const numero = await enTransaction(async (tx) => {
    const vente = await tx.venteCarte.findUnique({
      where: { id: venteId },
      include: { mouvements: { include: { semaine: true, annulePar: true } } },
    });
    if (!vente) throw new ErreurMetier("Vente introuvable.");
    if (vente.statut === "ANNULEE") throw new ErreurMetier("Cette vente est déjà annulée.");
    if (vente.mouvements.some((m) => m.semaine.statut === "CLOTUREE"))
      throw new ErreurMetier(
        "Cette vente a un mouvement dans une semaine clôturée : annulation impossible.",
      );
    await tx.$queryRaw`SELECT id FROM "Carte" WHERE id = ${vente.carteId} FOR UPDATE`;
    const regles = await lireRegles(tx);
    for (const m of vente.mouvements.filter((x) => !x.annuleMouvementId && !x.annulePar)) {
      const inverse = await inscrireMouvement(
        tx,
        {
          ...preparerContrePassation(m, false),
          date: instant,
          automatique: true,
          filiale: m.filiale,
          saisiParId: acteur.id,
        },
        regles.fuseau,
      );
      await tx.mouvement.update({ where: { id: inverse.id }, data: { venteCarteId: vente.id } });
    }
    await tx.carte.update({
      where: { id: vente.carteId },
      data: { stock: { increment: vente.quantite } },
    });
    await tx.venteCarte.update({ where: { id: venteId }, data: { statut: "ANNULEE" } });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "vente.annuler",
      cible: `VenteCarte:${vente.numero}`,
      details: { quantite: vente.quantite, montant: vente.montant },
    });
    return vente.numero;
  });
  revaliderCards();
  return { numero };
}
