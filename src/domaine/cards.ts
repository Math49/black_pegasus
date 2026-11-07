import { ErreurMetier } from "./types";

// Black Pégasus Cards (CONCEPTION-FILIALES § 6) : montants et stock, en entiers.

/** Montant d'une vente : prix unitaire × quantité (entiers, quantité ≥ 1). */
export function montantVente(prixUnitaire: number, quantite: number): number {
  if (!Number.isSafeInteger(prixUnitaire) || prixUnitaire < 0)
    throw new ErreurMetier("Prix unitaire invalide.");
  if (!Number.isSafeInteger(quantite) || quantite < 1)
    throw new ErreurMetier("La quantité doit être un entier d’au moins 1.");
  const montant = prixUnitaire * quantite;
  if (!Number.isSafeInteger(montant)) throw new ErreurMetier("Montant trop élevé.");
  return montant;
}

/** Refuse une vente au-delà du stock ; renvoie le stock restant après la vente. */
export function verifierStock(stock: number, quantite: number): number {
  if (quantite > stock)
    throw new ErreurMetier(
      stock === 0
        ? "Cette carte est épuisée."
        : `Stock insuffisant : ${stock} exemplaire${stock > 1 ? "s" : ""} restant${stock > 1 ? "s" : ""}.`,
    );
  return stock - quantite;
}

export type EtatCarte = { epuisee: boolean; libelle: string };

/** Libellé public du stock : « Épuisée » à 0, sinon « N exemplaire(s) ». */
export function etatCarte(stock: number): EtatCarte {
  if (stock <= 0) return { epuisee: true, libelle: "Épuisée" };
  return { epuisee: false, libelle: `${stock} exemplaire${stock > 1 ? "s" : ""}` };
}

/** Motif de la recette inscrite au registre pour une vente. */
export const motifVente = (v: { carteNom: string; quantite: number; clientNom: string }) =>
  `Vente de cartes · ${v.quantite} × ${v.carteNom} · ${v.clientNom}`;

type CarteClassee = {
  nom: string;
  ordre: number;
  categorie: { id: string; nom: string; ordre: number };
};

/** Regroupe les cartes par catégorie, triées par ordre puis nom (sans modifier l'entrée). */
export function regrouperCartes<T extends CarteClassee>(cartes: readonly T[]) {
  const groupes = new Map<string, { categorie: T["categorie"]; cartes: T[] }>();
  for (const c of [...cartes].sort(
    (a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
  )) {
    let g = groupes.get(c.categorie.id);
    if (!g) groupes.set(c.categorie.id, (g = { categorie: c.categorie, cartes: [] }));
    g.cartes.push(c);
  }
  return [...groupes.values()].sort(
    (a, b) =>
      a.categorie.ordre - b.categorie.ordre || a.categorie.nom.localeCompare(b.categorie.nom, "fr"),
  );
}

/** Recherche insensible à la casse et aux accents dans le nom d'une carte. */
export function correspondRecherche(nom: string, recherche: string): boolean {
  const normaliser = (s: string) =>
    s
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
  const q = normaliser(recherche);
  return q === "" || normaliser(nom).includes(q);
}
