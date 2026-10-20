import { disponibilite } from "./disponibilite";
import type { StatutExemplaire, TypeVehicule } from "./types";

// Filtres, tri et sélections de la flotte publique (maquettes 01, 02, 03).

export type VehiculeFlotte = {
  slug: string;
  nom: string;
  type: TypeVehicule;
  categorie: string;
  ordreCategorie: number;
  places: number;
  contenanceKg: number;
  prixHeure: number;
  prixJour: number;
  exemplaires: readonly { statut: StatutExemplaire }[];
};

export const TYPES: readonly TypeVehicule[] = ["BATEAU", "AVION", "HELICOPTERE"];

export const TRANCHES_PLACES = { "1-2": [1, 2], "3-6": [3, 6], "7+": [7, Infinity] } as const;
export const TRANCHES_CONTENANCE = {
  "-100": [0, 99],
  "100-500": [100, 500],
  "500+": [501, Infinity],
} as const;
export const TRIS = ["recommandes", "prix-croissant", "prix-decroissant", "places"] as const;

export type TranchePlaces = keyof typeof TRANCHES_PLACES;
export type TrancheContenance = keyof typeof TRANCHES_CONTENANCE;
export type Tri = (typeof TRIS)[number];

export type FiltresFlotte = {
  type: TypeVehicule;
  /** null : toutes les catégories. */
  categories: string[] | null;
  places: TranchePlaces | null;
  contenance: TrancheContenance | null;
  prixMax: number | null;
  dispo: boolean;
  tri: Tri;
};

type Params = Record<string, string | string[] | undefined>;
const premier = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim();
// « 7+ » non encodé arrive en « 7 » : on le relit comme « 7+ ».
const plus = (v: string | undefined) => (v && /^\d+$/.test(v) ? `${v}+` : v);
const parmi = <T extends string>(valeurs: readonly T[], v: string | undefined) =>
  valeurs.includes(v as T) ? (v as T) : null;

/** Lit les filtres de l'URL (`?type=&categorie=&places=&contenance=&prixMax=&dispo=1&tri=`). */
export function lireFiltres(params: Params): FiltresFlotte {
  const categorie = premier(params.categorie);
  const prix = Number(premier(params.prixMax));
  return {
    type: parmi(TYPES, premier(params.type)) ?? "BATEAU",
    categories:
      categorie === undefined
        ? null
        : categorie
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean),
    places: parmi(Object.keys(TRANCHES_PLACES) as TranchePlaces[], plus(premier(params.places))),
    contenance: parmi(
      Object.keys(TRANCHES_CONTENANCE) as TrancheContenance[],
      plus(premier(params.contenance)),
    ),
    prixMax: Number.isSafeInteger(prix) && prix > 0 ? prix : null,
    dispo: premier(params.dispo) === "1",
    tri: parmi(TRIS, premier(params.tri)) ?? "recommandes",
  };
}

/** Sérialise les filtres en chaîne de requête (valeurs par défaut omises). */
export function ecrireFiltres(f: FiltresFlotte): string {
  const p = new URLSearchParams();
  p.set("type", f.type);
  if (f.categories !== null) p.set("categorie", f.categories.join(","));
  if (f.places) p.set("places", f.places);
  if (f.contenance) p.set("contenance", f.contenance);
  if (f.prixMax !== null) p.set("prixMax", String(f.prixMax));
  if (f.dispo) p.set("dispo", "1");
  if (f.tri !== "recommandes") p.set("tri", f.tri);
  return p.toString();
}

const dansTranche = (n: number, [min, max]: readonly [number, number]) => n >= min && n <= max;

export function filtrerFlotte<V extends VehiculeFlotte>(
  vehicules: readonly V[],
  f: FiltresFlotte,
): V[] {
  const resultat = vehicules.filter(
    (v) =>
      v.type === f.type &&
      (f.categories === null || f.categories.includes(v.categorie)) &&
      (!f.places || dansTranche(v.places, TRANCHES_PLACES[f.places])) &&
      (!f.contenance || dansTranche(v.contenanceKg, TRANCHES_CONTENANCE[f.contenance])) &&
      (f.prixMax === null || v.prixHeure <= f.prixMax) &&
      (!f.dispo || disponibilite(v.exemplaires).libres > 0),
  );
  return trierFlotte(resultat, f.tri);
}

export function trierFlotte<V extends VehiculeFlotte>(vehicules: readonly V[], tri: Tri): V[] {
  const comparer: Record<Tri, (a: V, b: V) => number> = {
    recommandes: (a, b) => a.ordreCategorie - b.ordreCategorie || a.prixHeure - b.prixHeure,
    "prix-croissant": (a, b) => a.prixHeure - b.prixHeure,
    "prix-decroissant": (a, b) => b.prixHeure - a.prixHeure,
    places: (a, b) => b.places - a.places || a.prixHeure - b.prixHeure,
  };
  return [...vehicules].sort((a, b) => comparer[tri](a, b) || a.nom.localeCompare(b.nom, "fr"));
}

/** Catégories d'un type, dans l'ordre, avec le nombre de modèles visibles. */
export function categoriesDuType(vehicules: readonly VehiculeFlotte[], type: TypeVehicule) {
  const parNom = new Map<string, { nom: string; ordre: number; nombre: number }>();
  for (const v of vehicules.filter((v) => v.type === type)) {
    const c = parNom.get(v.categorie) ?? { nom: v.categorie, ordre: v.ordreCategorie, nombre: 0 };
    c.nombre++;
    parNom.set(v.categorie, c);
  }
  return [...parNom.values()].sort((a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"));
}

/**
 * Histogramme des prix à l'heure (barres de hauteur relative 0–1) sur `nombre` intervalles.
 * `lissage` (en largeur de barre) étale chaque prix sur ses voisines pour une silhouette continue.
 */
export function histogrammePrix(prix: readonly number[], nombre = 15, lissage = 0) {
  if (prix.length === 0)
    return { min: 0, max: 0, barres: [] as { haut: number; jusqua: number }[] };
  const min = Math.min(...prix);
  const max = Math.max(...prix);
  const pas = (max - min) / nombre || 1;
  const comptes = Array.from({ length: nombre }, () => 0);
  for (const p of prix) {
    const centre = Math.min(nombre - 1, Math.floor((p - min) / pas));
    if (lissage <= 0) comptes[centre]++;
    else comptes.forEach((_, i) => (comptes[i] += Math.exp(-(((i - centre) / lissage) ** 2))));
  }
  const plusHaut = Math.max(...comptes);
  return {
    min,
    max,
    barres: comptes.map((c, i) => ({
      haut: c / plusHaut,
      jusqua: Math.round(min + pas * (i + 1)),
    })),
  };
}

/** Véhicule vedette (accueil) : le plus cher à l'heure. */
export const vehiculeVedette = <V extends VehiculeFlotte>(vehicules: readonly V[]) =>
  trierFlotte(vehicules, "prix-decroissant")[0] ?? null;

/**
 * Sélection d'exception : le plus cher de chaque type ; le véhicule vedette en premier,
 * puis les autres dans l'ordre des types (maquette 01 : Luxor, Toro2, SuperVolito Carbon).
 */
export function selectionException<V extends VehiculeFlotte>(vehicules: readonly V[]): V[] {
  const vedette = vehiculeVedette(vehicules);
  const parType = TYPES.map((t) => vehiculeVedette(vehicules.filter((v) => v.type === t))).filter(
    (v): v is V => v !== null,
  );
  return vedette ? [vedette, ...parType.filter((v) => v !== vedette)] : parType;
}

/** Véhicules similaires : même type d'abord, puis les autres, par prix le plus proche. */
export function vehiculesSimilaires<V extends VehiculeFlotte>(
  reference: VehiculeFlotte,
  vehicules: readonly V[],
  nombre = 3,
): V[] {
  const ecart = (v: V) => Math.abs(v.prixHeure - reference.prixHeure);
  return vehicules
    .filter((v) => v.slug !== reference.slug)
    .sort(
      (a, b) =>
        Number(b.type === reference.type) - Number(a.type === reference.type) ||
        ecart(a) - ecart(b) ||
        a.nom.localeCompare(b.nom, "fr"),
    )
    .slice(0, nombre);
}
