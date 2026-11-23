import "server-only";
import { TZDate } from "@date-fns/tz";
import { cache } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import {
  ajusterStock,
  calculerVente,
  motifVente,
  verifierNouvelOrdre,
  type LigneSaisie,
} from "@/domaine/cards";
import { preparerContrePassation } from "@/domaine/comptabilite";
import type { ParametresEnchere } from "@/domaine/encheres";
import { cleCompteurVentes, numeroVente } from "@/domaine/numerotation";
import { ErreurMetier } from "@/domaine/types";
import type { ImageEnvoyee } from "@/lib/fichiers";
import type { CompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";
import { ouvrirEnchereTx } from "./encheres";
import { inscrireMouvement, lireRegles } from "./mouvements";
import { enregistrerFichier, supprimerFichier } from "./stockage";

export function revaliderCards() {
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
  const contient = { contains: recherche, mode: "insensitive" as const };
  const where = recherche
    ? {
        OR: [
          { numero: contient },
          { clientNom: contient },
          { lignes: { some: { carteNom: contient } } },
        ],
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
      lignes: { orderBy: { montant: "desc" } },
      saisiePar: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
      mouvements: { select: { semaine: { select: { statut: true } } } },
    },
  });
  return { ventes, total, pageCourante };
}

/** Cartes proposées à la vente : en stock et non retirées (on ne vend pas ce qu'on n'a plus). */
export async function lireCartesVendables() {
  return prisma.carte.findMany({
    where: { supprimeLe: null, stock: { gt: 0 }, encheres: { none: { statut: "OUVERTE" } } },
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
  donnees: { nom: string },
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
      } else {
        // Nouvelle catégorie en fin de liste ; l'ordre se change ensuite par glisser-déposer.
        const max = await tx.categorieCarte.aggregate({ _max: { ordre: true } });
        await tx.categorieCarte.create({ data: { ...donnees, ordre: (max._max.ordre ?? 0) + 1 } });
      }
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
  visible: boolean;
};

/** Ordre d'une carte ajoutée en fin de catégorie. */
async function ordreEnFin(tx: Tx, categorieId: string) {
  const max = await tx.carte.aggregate({
    where: { categorieId, supprimeLe: null },
    _max: { ordre: true },
  });
  return (max._max.ordre ?? 0) + 1;
}

/**
 * Crée ou modifie une carte. `photo` : nouvelle image, `null` pour revenir au visuel par
 * défaut, `undefined` pour garder la photo actuelle. Une correction du stock est journalisée.
 */
export async function enregistrerCarte(
  acteur: CompteConnecte,
  id: string | null,
  donnees: DonneesCarte,
  photo: ImageEnvoyee | null | undefined,
  /** Mise en enchère (à la création ou sur une carte sans enchère ouverte). */
  enchere?: ParametresEnchere,
) {
  const instant = await maintenant();
  const cle = photo ? await enregistrerFichier("cartes", photo.octets, photo.extension) : null;
  let ancienne: string | null = null;
  try {
    await ecrire(acteur, "cards.carte", id ? `Carte:${id}` : "Carte", async (tx) => {
      if (!(await tx.categorieCarte.findUnique({ where: { id: donnees.categorieId } })))
        throw new ErreurMetier("Catégorie introuvable.");
      const data = { ...donnees, ...(photo !== undefined && { photo: cle }) };
      if (!id) {
        const ordre = await ordreEnFin(tx, donnees.categorieId);
        const cree = await tx.carte.create({ data: { ...data, ordre } });
        if (enchere) await ouvrirEnchereTx(tx, acteur, cree.id, enchere, instant);
        return { details: { nom: cree.nom, stock: cree.stock }, valeur: undefined };
      }
      // Verrou : une vente simultanée ne peut pas croiser une correction du stock.
      await tx.$queryRaw`SELECT id FROM "Carte" WHERE id = ${id} FOR UPDATE`;
      const avant = await tx.carte.findFirst({ where: { id, supprimeLe: null } });
      if (!avant) throw new ErreurMetier("Carte introuvable.");
      if (photo !== undefined) ancienne = avant.photo;
      // Changement de catégorie : la carte va en fin de sa nouvelle catégorie.
      const ordre =
        avant.categorieId === donnees.categorieId
          ? avant.ordre
          : await ordreEnFin(tx, donnees.categorieId);
      await tx.carte.update({ where: { id }, data: { ...data, ordre } });
      if (enchere) await ouvrirEnchereTx(tx, acteur, id, enchere, instant);
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

/** Ordre des catégories après un glisser-déposer : toutes les catégories, dans le nouvel ordre. */
export function ordonnerCategories(acteur: CompteConnecte, ids: readonly string[]) {
  return ecrire(acteur, "cards.ordre", "CategorieCarte", async (tx) => {
    const existantes = await tx.categorieCarte.findMany({ select: { id: true } });
    verifierNouvelOrdre(
      existantes.map((c) => c.id),
      ids,
    );
    for (const [i, id] of ids.entries())
      await tx.categorieCarte.update({ where: { id }, data: { ordre: i + 1 } });
    return { details: { categories: ids.length }, valeur: undefined };
  });
}

/** Ordre des cartes d'une catégorie après un glisser-déposer. */
export function ordonnerCartes(
  acteur: CompteConnecte,
  categorieId: string,
  ids: readonly string[],
) {
  return ecrire(acteur, "cards.ordre", `CategorieCarte:${categorieId}`, async (tx) => {
    const cat = await tx.categorieCarte.findUnique({ where: { id: categorieId } });
    if (!cat) throw new ErreurMetier("Catégorie introuvable.");
    const existantes = await tx.carte.findMany({
      where: { categorieId, supprimeLe: null },
      select: { id: true },
    });
    verifierNouvelOrdre(
      existantes.map((c) => c.id),
      ids,
    );
    for (const [i, id] of ids.entries())
      await tx.carte.update({ where: { id }, data: { ordre: i + 1 } });
    return { details: { categorie: cat.nom, cartes: ids.length }, valeur: undefined };
  });
}

/** Carte déposée sur une autre catégorie : elle passe en fin de cette catégorie. */
export function deplacerCarte(acteur: CompteConnecte, carteId: string, categorieId: string) {
  return ecrire(acteur, "cards.deplacer", `Carte:${carteId}`, async (tx) => {
    const [c, cat] = await Promise.all([
      tx.carte.findFirst({ where: { id: carteId, supprimeLe: null } }),
      tx.categorieCarte.findUnique({ where: { id: categorieId } }),
    ]);
    if (!c) throw new ErreurMetier("Carte introuvable.");
    if (!cat) throw new ErreurMetier("Catégorie introuvable.");
    if (c.categorieId === categorieId) return { valeur: undefined };
    await tx.carte.update({
      where: { id: carteId },
      data: { categorieId, ordre: await ordreEnFin(tx, categorieId) },
    });
    return { details: { carte: c.nom, categorie: cat.nom }, valeur: undefined };
  });
}

/** Ajustement rapide du stock (+ / −), journalisé comme une correction. */
export function ajusterStockCarte(acteur: CompteConnecte, carteId: string, delta: number) {
  return ecrire(acteur, "cards.stock", `Carte:${carteId}`, async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Carte" WHERE id = ${carteId} FOR UPDATE`;
    const c = await tx.carte.findFirst({ where: { id: carteId, supprimeLe: null } });
    if (!c) throw new ErreurMetier("Carte introuvable.");
    const stock = ajusterStock(c.stock, delta);
    await tx.carte.update({ where: { id: carteId }, data: { stock } });
    return { details: { carte: c.nom, avant: c.stock, apres: stock }, valeur: stock };
  });
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
  lignes: LigneSaisie[];
  /** Montant encaissé ; null : le total du catalogue. */
  montantEncaisse: number | null;
  clientNom: string;
  clientTelephone: string | null;
};

/**
 * Enregistre une vente dans une transaction : verrou sur les cartes, contrôle du stock,
 * numéro BPC, lignes, stock, recette au registre. `prixImposes` remplace le prix du catalogue
 * (vente d'une enchère au montant de l'offre gagnante) ; `enchereId` autorise la carte en
 * enchère concernée.
 */
export async function vendreTx(
  tx: Tx,
  acteur: CompteConnecte,
  d: DonneesVente,
  instant: Date,
  options: { prixImposes?: ReadonlyMap<string, number>; enchereId?: string } = {},
) {
  // Deux ventes simultanées du dernier exemplaire s'excluent ; ordre fixe contre l'interblocage.
  const ids = [...new Set(d.lignes.map((l) => l.carteId))].sort();
  await tx.$queryRaw`SELECT id FROM "Carte" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
  const cartes = await tx.carte.findMany({
    where: { id: { in: ids }, supprimeLe: null },
    include: { encheres: { where: { statut: "OUVERTE" }, select: { id: true } } },
  });
  // Une carte aux enchères ne se vend qu'en concluant son enchère.
  const enEnchere = cartes.find((c) => c.encheres.some((e) => e.id !== options.enchereId));
  if (enEnchere)
    throw new ErreurMetier(`${enEnchere.nom} est aux enchères : vente classique impossible.`);
  // Montants toujours recalculés ici, jamais repris du navigateur (sauf l'encaissé, borné).
  const calcul = calculerVente(
    cartes.map((c) => ({ ...c, prix: options.prixImposes?.get(c.id) ?? c.prix })),
    d.lignes,
    d.montantEncaisse,
  );

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
      montantCatalogue: calcul.montantCatalogue,
      remise: calcul.remise,
      montant: calcul.montant,
      clientNom,
      clientTelephone: d.clientTelephone?.trim() || null,
      date: instant,
      saisieParId: acteur.id,
      lignes: {
        create: calcul.lignes.map((l) => ({
          carteId: l.carteId,
          carteNom: l.carteNom,
          prixUnitaire: l.prixUnitaire,
          quantite: l.quantite,
          montant: l.montant,
        })),
      },
    },
  });
  for (const l of calcul.lignes)
    await tx.carte.update({ where: { id: l.carteId }, data: { stock: l.stockRestant } });
  const mouvement = await inscrireMouvement(
    tx,
    {
      date: instant,
      sens: "ENTREE",
      categorie: "VENTE_CARTES",
      montant: calcul.montant,
      motif:
        (options.enchereId ? "Enchère · " : "") +
        motifVente({ lignes: calcul.lignes, clientNom, remise: calcul.remise }),
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
    details: {
      cartes: calcul.lignes.map((l) => `${l.quantite} × ${l.carteNom}`).join(", "),
      montantCatalogue: calcul.montantCatalogue,
      remise: calcul.remise,
      montant: calcul.montant,
      client: clientNom,
      ...(options.enchereId && { enchere: options.enchereId }),
    },
  });
  return cree;
}

/** Vente saisie dans le panel. */
export async function creerVente(acteur: CompteConnecte, d: DonneesVente) {
  const instant = await maintenant();
  const vente = await enTransaction((tx) => vendreTx(tx, acteur, d, instant));
  revaliderCards();
  return vente;
}

/** Annulation (administrateur) : contre-passation de la recette et stock rendu. */
export async function annulerVente(acteur: CompteConnecte, venteId: string) {
  const instant = await maintenant();
  const numero = await enTransaction(async (tx) => {
    const vente = await tx.venteCarte.findUnique({
      where: { id: venteId },
      include: { lignes: true, mouvements: { include: { semaine: true, annulePar: true } } },
    });
    if (!vente) throw new ErreurMetier("Vente introuvable.");
    if (vente.statut === "ANNULEE") throw new ErreurMetier("Cette vente est déjà annulée.");
    if (vente.mouvements.some((m) => m.semaine.statut === "CLOTUREE"))
      throw new ErreurMetier(
        "Cette vente a un mouvement dans une semaine clôturée : annulation impossible.",
      );
    const ids = [...new Set(vente.lignes.map((l) => l.carteId))].sort();
    await tx.$queryRaw`SELECT id FROM "Carte" WHERE id = ANY(${ids}) ORDER BY id FOR UPDATE`;
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
    // Stock rendu, ligne par ligne.
    for (const l of vente.lignes)
      await tx.carte.update({
        where: { id: l.carteId },
        data: { stock: { increment: l.quantite } },
      });
    await tx.venteCarte.update({ where: { id: venteId }, data: { statut: "ANNULEE" } });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "vente.annuler",
      cible: `VenteCarte:${vente.numero}`,
      details: {
        exemplaires: vente.lignes.reduce((t, l) => t + l.quantite, 0),
        montant: vente.montant,
      },
    });
    return vente.numero;
  });
  revaliderCards();
  return { numero };
}
