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
 * Filiale imposée par les catégories système : les recettes et cautions de location sont à
 * Location, la formation à Formation, les cartes à Cards. Les autres catégories sont libres.
 */
const IMPOSEE: Partial<Record<CategorieMouvement, CodeFiliale>> = {
  LOCATION: "BPL",
  PENALITE: "BPL",
  CAUTION_ENCAISSEE: "BPL",
  CAUTION_RENDUE: "BPL",
  FORMATION: "BPF",
  VENTE_CARTES: "BPC",
};

/** Filiale imposée par la catégorie (le choix est alors verrouillé à la saisie). */
export const filialeImposee = (categorie: CategorieMouvement): CodeFiliale | null =>
  IMPOSEE[categorie] ?? null;

/** Filiale proposée à la saisie : imposée, sinon celle définie sur la catégorie. */
export function filialeParDefaut(categorie: {
  id: CategorieMouvement;
  filiale: CodeFiliale | null;
}): CodeFiliale | null {
  return IMPOSEE[categorie.id] ?? categorie.filiale;
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

/** Section du site de chaque filiale (attribut `data-filiale` : couleur d'accent). */
export const SLUGS_FILIALE: Record<CodeFiliale, string> = {
  BPL: "location",
  BPF: "formation",
  BPC: "cards",
};

// ── Ventilation comptable par filiale (phase F-5) ─────────────────────────────

/** Filtre du registre : une filiale, ou « groupe » pour les frais communs. */
export type FiltreFiliale = CodeFiliale | "groupe";

export const FILTRES_FILIALE: readonly FiltreFiliale[] = [...CODES_FILIALE, "groupe"];

/** Lit `?filiale=` : BPL, BPF, BPC ou groupe (insensible à la casse) ; null sinon. */
export function lireFiltreFiliale(valeur: unknown): FiltreFiliale | null {
  if (typeof valeur !== "string") return null;
  const v = valeur.trim();
  if (v.toLowerCase() === "groupe") return "groupe";
  return (CODES_FILIALE as readonly string[]).includes(v.toUpperCase())
    ? (v.toUpperCase() as CodeFiliale)
    : null;
}

export const libelleFiltreFiliale = (f: FiltreFiliale) =>
  f === "groupe" ? "Groupe" : LIBELLES_FILIALE[f];

/** Garde les mouvements d'une filiale (ou du groupe) ; tous si le filtre est nul. */
export function filtrerParFiliale<M extends { filiale: CodeFiliale | null }>(
  mouvements: readonly M[],
  filtre: FiltreFiliale | null,
): M[] {
  if (!filtre) return [...mouvements];
  return mouvements.filter((m) =>
    filtre === "groupe" ? m.filiale === null : m.filiale === filtre,
  );
}
