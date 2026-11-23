import { formaterDollars } from "./argent";
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

// ── Vente de plusieurs cartes (REFONTE-ADMIN § 4) ──────────────────────────

export const LIGNES_MAX_VENTE = 50;

export type LigneSaisie = { carteId: string; quantite: number };
export type CarteAVendre = { id: string; nom: string; prix: number; stock: number };
export type LigneCalculee = {
  carteId: string;
  carteNom: string;
  prixUnitaire: number;
  quantite: number;
  montant: number;
  stockRestant: number;
};
export type CalculVente = {
  lignes: LigneCalculee[];
  /** Total au prix du catalogue. */
  montantCatalogue: number;
  /** Montant encaissé (inscrit au registre). */
  montant: number;
  remise: number;
};

/**
 * Calcule une vente à partir des cartes lues en base : montant de chaque ligne, stock restant,
 * total catalogue et remise. `montantEncaisse` null : le total du catalogue est encaissé.
 * Le montant encaissé est un entier entre 1 et le total (jamais au-dessus).
 */
export function calculerVente(
  cartes: readonly CarteAVendre[],
  saisies: readonly LigneSaisie[],
  montantEncaisse: number | null,
): CalculVente {
  if (saisies.length === 0) throw new ErreurMetier("Ajoutez au moins une carte à la vente.");
  if (saisies.length > LIGNES_MAX_VENTE)
    throw new ErreurMetier(`${LIGNES_MAX_VENTE} cartes différentes au maximum par vente.`);
  if (new Set(saisies.map((l) => l.carteId)).size !== saisies.length)
    throw new ErreurMetier("Une même carte apparaît deux fois : regroupez la quantité.");
  const lignes = saisies.map((l) => {
    const carte = cartes.find((c) => c.id === l.carteId);
    if (!carte) throw new ErreurMetier("Carte introuvable ou plus en vente.");
    const montant = montantVente(carte.prix, l.quantite);
    let stockRestant: number;
    try {
      stockRestant = verifierStock(carte.stock, l.quantite);
    } catch (e) {
      throw new ErreurMetier(`${carte.nom} : ${(e as Error).message}`);
    }
    return {
      carteId: carte.id,
      carteNom: carte.nom,
      prixUnitaire: carte.prix,
      quantite: l.quantite,
      montant,
      stockRestant,
    };
  });
  const montantCatalogue = lignes.reduce((t, l) => t + l.montant, 0);
  if (!Number.isSafeInteger(montantCatalogue)) throw new ErreurMetier("Montant trop élevé.");
  if (montantCatalogue <= 0)
    throw new ErreurMetier("Ces cartes n’ont pas de prix : vente impossible.");
  const montant = montantEncaisse ?? montantCatalogue;
  if (!Number.isSafeInteger(montant) || montant < 1)
    throw new ErreurMetier("Montant encaissé : nombre entier d’au moins $1.");
  if (montant > montantCatalogue)
    throw new ErreurMetier(
      `Le montant encaissé ne peut pas dépasser le prix du catalogue (${formaterDollars(montantCatalogue)}).`,
    );
  return { lignes, montantCatalogue, montant, remise: montantCatalogue - montant };
}

/** Remise en pourcentage du catalogue, arrondie à l'unité (affichage). */
export const remisePourcent = (remise: number, montantCatalogue: number) =>
  montantCatalogue <= 0 ? 0 : Math.round((remise / montantCatalogue) * 100);

/** Résumé des lignes : « 2 × Dragon, Kraken » ou « 5 cartes (9 exemplaires) » au-delà de trois. */
export function resumeLignes(lignes: readonly { carteNom: string; quantite: number }[]): string {
  if (lignes.length > 3) {
    const exemplaires = lignes.reduce((t, l) => t + l.quantite, 0);
    return `${lignes.length} cartes (${exemplaires} exemplaires)`;
  }
  return lignes
    .map((l) => (l.quantite > 1 ? `${l.quantite} × ${l.carteNom}` : l.carteNom))
    .join(", ");
}

/** Motif de la recette inscrite au registre pour une vente. */
export const motifVente = (v: {
  lignes: readonly { carteNom: string; quantite: number }[];
  clientNom: string;
  remise?: number;
}) =>
  `Vente de cartes · ${resumeLignes(v.lignes)} · ${v.clientNom}` +
  (v.remise ? ` · remise ${formaterDollars(v.remise)}` : "");

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

// ── Gestion du catalogue à gros volume (REFONTE-ADMIN § 3) ──────────────────

/**
 * Vérifie qu'un nouvel ordre (glisser-déposer) contient exactement les éléments attendus :
 * ni doublon, ni élément manquant ou étranger.
 */
export function verifierNouvelOrdre(attendus: readonly string[], recus: readonly string[]): void {
  const a = new Set(attendus);
  const r = new Set(recus);
  if (r.size !== recus.length || a.size !== r.size || [...r].some((id) => !a.has(id)))
    throw new ErreurMetier("L’ordre reçu ne correspond plus au catalogue : rechargez la page.");
}

/** Ajustement rapide du stock (+ / −) ; jamais en dessous de zéro. */
export function ajusterStock(stock: number, delta: number): number {
  if (!Number.isSafeInteger(delta) || delta === 0)
    throw new ErreurMetier("Ajustement de stock invalide.");
  const nouveau = stock + delta;
  if (nouveau < 0) throw new ErreurMetier("Le stock ne peut pas être négatif.");
  if (nouveau > 100_000) throw new ErreurMetier("Stock : maximum 100 000.");
  return nouveau;
}

export type FiltresCatalogue = {
  q: string;
  visibilite: "toutes" | "visibles" | "masquees";
  stock: "tous" | "enStock" | "epuisees";
  mode: "tous" | "vente" | "enchere";
};

export const FILTRES_PAR_DEFAUT: FiltresCatalogue = {
  q: "",
  visibilite: "toutes",
  stock: "tous",
  mode: "tous",
};

/** Le glisser-déposer n'a de sens que sur la liste complète d'une catégorie. */
export const filtresActifs = (f: FiltresCatalogue) =>
  f.q.trim() !== "" || f.visibilite !== "toutes" || f.stock !== "tous" || f.mode !== "tous";

/** Filtres de l'écran Cartes du panel (recherche sur toutes les catégories). */
export function filtrerCatalogue<
  C extends { nom: string; visible: boolean; stock: number; enchere?: unknown },
>(cartes: readonly C[], f: FiltresCatalogue): C[] {
  return cartes.filter(
    (c) =>
      correspondRecherche(c.nom, f.q) &&
      (f.visibilite === "toutes" || c.visible === (f.visibilite === "visibles")) &&
      (f.stock === "tous" || c.stock > 0 === (f.stock === "enStock")) &&
      (f.mode === "tous" || Boolean(c.enchere) === (f.mode === "enchere")),
  );
}

/**
 * Sépare un code de série en tête de nom (« BP-00 Echoes of the Past » → code « BP-00 »,
 * titre « Echoes of the Past ») pour l'afficher en petit au-dessus du titre.
 */
export function decouperNomCategorie(nom: string): { code: string | null; titre: string } {
  const m = /^([A-Z]{1,5}-\d{1,4})\s+(.+)$/.exec(nom.trim());
  return m ? { code: m[1], titre: m[2] } : { code: null, titre: nom.trim() };
}
