import {
  ErreurMetier,
  type CategorieMouvement,
  type CodeFiliale,
  type Sens,
  type SensCategorie,
} from "./types";

// Catégories de mouvements gérées dans les Paramètres (REFONTE-ADMIN § 2).

export type DefinitionCategorie = {
  id: CategorieMouvement;
  nom: string;
  sens: SensCategorie;
  /** Filiale proposée à la saisie (imposée pour les catégories système d'une filiale). */
  filiale: CodeFiliale | null;
  justificatifObligatoire: boolean;
  /** Utilisée par l'application : renommable seulement, jamais supprimée. */
  systeme: boolean;
  /** Plus proposée à la saisie ; les mouvements existants la gardent. */
  archivee: boolean;
};

/** Catégories système : inscrites automatiquement ou lues par les calculs. */
export const CATEGORIES_SYSTEME = [
  "LOCATION",
  "PENALITE",
  "CAUTION_ENCAISSEE",
  "CAUTION_RENDUE",
  "FORMATION",
  "VENTE_CARTES",
  "IMPOTS",
] as const;

export const estCategorieSysteme = (id: CategorieMouvement) =>
  (CATEGORIES_SYSTEME as readonly string[]).includes(id);

export const LIBELLES_SENS_CATEGORIE: Record<SensCategorie, string> = {
  ENTREE: "Entrée",
  SORTIE: "Sortie",
  LES_DEUX: "Entrée ou sortie",
};

export const sensAutorise = (c: Pick<DefinitionCategorie, "sens">, sens: Sens) =>
  c.sens === "LES_DEUX" || c.sens === sens;

/** Catégories proposées à la saisie d'un mouvement dans ce sens. */
export const categoriesSaisissables = <C extends DefinitionCategorie>(
  categories: readonly C[],
  sens: Sens,
): C[] => categories.filter((c) => !c.archivee && sensAutorise(c, sens));

/** Une sortie exige un justificatif si sa catégorie le demande. */
export const exigeJustificatif = (
  sens: Sens,
  c: Pick<DefinitionCategorie, "justificatifObligatoire"> | undefined,
) => sens === "SORTIE" && (c?.justificatifObligatoire ?? false);

/** Nom affiché d'une catégorie (identifiant si elle est introuvable). */
export const nomCategorie = (
  categories: readonly Pick<DefinitionCategorie, "id" | "nom">[],
  id: CategorieMouvement,
) => categories.find((c) => c.id === id)?.nom ?? id;

export type SaisieCategorie = {
  nom: string;
  sens: SensCategorie;
  filiale: CodeFiliale | null;
  justificatifObligatoire: boolean;
};

/**
 * Règles d'une création ou d'une modification. Une catégorie système ne change que de nom ;
 * le sens d'une catégorie utilisée ne peut que s'élargir (« Entrée ou sortie »).
 */
export function verifierCategorie(p: {
  saisie: SaisieCategorie;
  existante?: DefinitionCategorie;
  utilisations: number;
  nomsPris: readonly string[];
}): void {
  const { saisie, existante } = p;
  const nom = saisie.nom.trim();
  if (nom.length < 2 || nom.length > 40) throw new ErreurMetier("Nom : 2 à 40 caractères.");
  const cle = (t: string) => t.trim().toLocaleLowerCase("fr");
  if (p.nomsPris.some((n) => cle(n) === cle(nom))) {
    throw new ErreurMetier(`La catégorie « ${nom} » existe déjà.`);
  }
  if (!existante) return;
  if (existante.systeme) {
    const change =
      saisie.sens !== existante.sens ||
      saisie.filiale !== existante.filiale ||
      saisie.justificatifObligatoire !== existante.justificatifObligatoire;
    if (change) throw new ErreurMetier("Une catégorie système ne peut qu’être renommée.");
    return;
  }
  if (p.utilisations > 0 && saisie.sens !== existante.sens && saisie.sens !== "LES_DEUX") {
    throw new ErreurMetier(
      "Catégorie déjà utilisée : son sens ne peut qu’être élargi à « Entrée ou sortie ».",
    );
  }
}

/** Suppression : catégorie non système et jamais utilisée ; sinon on l'archive. */
export function verifierSuppressionCategorie(c: DefinitionCategorie, utilisations: number): void {
  if (c.systeme) throw new ErreurMetier("Une catégorie système ne peut pas être supprimée.");
  if (utilisations > 0) {
    throw new ErreurMetier(
      `Catégorie utilisée par ${utilisations} mouvement${utilisations > 1 ? "s" : ""} : archivez-la plutôt.`,
    );
  }
}

export function verifierArchivageCategorie(c: DefinitionCategorie): void {
  if (c.systeme) throw new ErreurMetier("Une catégorie système ne peut pas être archivée.");
}
