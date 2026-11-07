import { ErreurMetier, type CategorieMouvement, type CodeFiliale } from "./types";

// Filiales du groupe Black Pégasus Compagnie (docs/CONCEPTION-FILIALES.md). Une seule
// comptabilité : chaque mouvement porte sa filiale, ou aucune (« Groupe », frais communs).

export const CODES_FILIALE: readonly CodeFiliale[] = ["BPL", "BPF", "BPC"];

/** Nom court affiché dans le panel (registre, sélecteurs). */
export const LIBELLES_FILIALE: Record<CodeFiliale, string> = {
  BPL: "Location",
  BPF: "Formation",
  BPC: "Cards",
};

export const libelleFiliale = (code: CodeFiliale | null) =>
  code ? LIBELLES_FILIALE[code] : "Groupe";

/**
 * Filiale imposée par la catégorie : les recettes et cautions de location sont à Location,
 * la formation à Formation, les cartes à Cards. Les autres catégories sont libres.
 */
const IMPOSEE: Partial<Record<CategorieMouvement, CodeFiliale>> = {
  LOCATION: "BPL",
  PENALITE: "BPL",
  CAUTION_ENCAISSEE: "BPL",
  CAUTION_RENDUE: "BPL",
  FORMATION: "BPF",
  VENTE_CARTES: "BPC",
  ACHAT_STOCK: "BPC",
};

/** Filiale imposée par la catégorie (le choix est alors verrouillé à la saisie). */
export const filialeImposee = (categorie: CategorieMouvement): CodeFiliale | null =>
  IMPOSEE[categorie] ?? null;

/** Filiale proposée à la saisie d'un mouvement manuel. */
export function filialeParDefaut(categorie: CategorieMouvement): CodeFiliale | null {
  if (IMPOSEE[categorie]) return IMPOSEE[categorie]!;
  if (categorie === "ACHAT_VEHICULE" || categorie === "ENTRETIEN") return "BPL";
  return null;
}

/** Refuse une filiale incohérente avec la catégorie (une location rattachée à Cards…). */
export function verifierFilialeMouvement(
  categorie: CategorieMouvement,
  filiale: CodeFiliale | null,
): void {
  const imposee = IMPOSEE[categorie];
  if (imposee && filiale !== imposee) {
    throw new ErreurMetier(`Cette catégorie relève de la filiale ${LIBELLES_FILIALE[imposee]}.`);
  }
}
