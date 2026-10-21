import { addDays } from "date-fns";
import { formaterDollars, SEPARATEUR_MILLIERS, SIGNE_MOINS } from "./argent";
import { montantSigne, natureMouvement } from "./comptabilite";
import { versHeureServeur } from "./dates";
import { libelleSemaine, numeroOperationAffiche } from "./numerotation";
import { contientInstant, semaineDe, type SemaineFiscale } from "./semaine";
import { ErreurMetier, type CategorieMouvement, type Sens } from "./types";

// Page Solde (HANDOFF § 5.3) et saisie manuelle des mouvements (CONCEPTION § 6.3–6.5).

export const LIBELLES_CATEGORIE: Record<CategorieMouvement, string> = {
  LOCATION: "Location",
  PENALITE: "Pénalité",
  CAUTION_ENCAISSEE: "Caution encaissée",
  CAUTION_RENDUE: "Caution rendue",
  ACHAT_VEHICULE: "Achat de véhicule",
  ENTRETIEN: "Entretien",
  IMPOTS: "Impôts",
  APPORT: "Apport",
  DIVERS: "Divers",
};

/** Ordre de la maquette (filtres et saisie). */
export const CATEGORIES = Object.keys(LIBELLES_CATEGORIE) as CategorieMouvement[];

/**
 * Sens de chaque catégorie : la synthèse comptable compte une recette en entrée et une
 * dépense en sortie, la saisie manuelle ne propose donc que les catégories du sens choisi.
 */
const SENS_CATEGORIE: Record<CategorieMouvement, Sens> = {
  LOCATION: "ENTREE",
  PENALITE: "ENTREE",
  CAUTION_ENCAISSEE: "ENTREE",
  APPORT: "ENTREE",
  CAUTION_RENDUE: "SORTIE",
  ACHAT_VEHICULE: "SORTIE",
  ENTRETIEN: "SORTIE",
  IMPOTS: "SORTIE",
  DIVERS: "SORTIE",
};

export const categoriesDuSens = (sens: Sens) =>
  CATEGORIES.filter((c) => SENS_CATEGORIE[c] === sens);

/** Le FISC exige un justificatif pour toute dépense (HANDOFF § 7.6). */
export const exigeJustificatif = (sens: Sens, categorie: CategorieMouvement) =>
  sens === "SORTIE" && natureMouvement(categorie) === "DEPENSE";

export type SaisieMouvement = {
  sens: Sens;
  categorie: CategorieMouvement;
  montant: number;
  motif: string;
  date: Date;
  avecJustificatif: boolean;
};

/** Règles de la saisie manuelle ; lève une ErreurMetier au premier manquement. */
export function verifierSaisieMouvement(s: SaisieMouvement, maintenant: Date): void {
  if (!Number.isSafeInteger(s.montant) || s.montant <= 0) {
    throw new ErreurMetier("Montant : nombre entier de dollars supérieur à zéro.");
  }
  if (SENS_CATEGORIE[s.categorie] !== s.sens) {
    throw new ErreurMetier(
      `La catégorie « ${LIBELLES_CATEGORIE[s.categorie]} » est une ${s.sens === "ENTREE" ? "sortie" : "entrée"}.`,
    );
  }
  if (s.motif.trim().length < 3) throw new ErreurMetier("Motif : 3 caractères minimum.");
  if (s.date.getTime() > maintenant.getTime()) {
    throw new ErreurMetier("La date du mouvement ne peut pas être dans le futur.");
  }
  if (exigeJustificatif(s.sens, s.categorie) && !s.avecJustificatif) {
    throw new ErreurMetier("Justificatif obligatoire pour une dépense.");
  }
}

/**
 * Contre-passation manuelle (§ 6.5) : administrateur, semaine ouverte, mouvement saisi à la
 * main. Les mouvements d'un contrat s'annulent avec le contrat.
 */
export function verifierContrePassation(m: {
  numero: string;
  automatique: boolean;
  semaineCloturee: boolean;
}): void {
  const n = numeroOperationAffiche(m.numero);
  if (m.automatique) {
    throw new ErreurMetier(`${n} vient d’un contrat : annulez le contrat pour le corriger.`);
  }
  if (m.semaineCloturee) throw new ErreurMetier(`${n} appartient à une semaine clôturée.`);
}

// ── Courbe et cartes ───────────────────────────────────────────────────────

const JOURS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"] as const;

export type PointCourbe = { libelle: string; solde: number; courant: boolean };

/**
 * Solde à l'ouverture puis en fin de chaque jour écoulé de la semaine (jusqu'à l'instant
 * présent pour le jour en cours) ; le dernier point est le solde courant.
 */
export function courbeSemaine(
  mouvements: readonly { date: Date; sens: Sens; montant: number }[],
  soldeOuverture: number,
  semaine: SemaineFiscale,
  maintenant: Date,
  fuseau: string,
): PointCourbe[] {
  const points: PointCourbe[] = [{ libelle: "Ouv.", solde: soldeOuverture, courant: false }];
  const lundi = versHeureServeur(semaine.debut, fuseau);
  const finPeriode = Math.min(semaine.fin.getTime(), maintenant.getTime());
  for (let j = 0; j < 7; j++) {
    const debutJour = addDays(lundi, j).getTime();
    if (debutJour > finPeriode) break;
    const borne = Math.min(addDays(lundi, j + 1).getTime(), finPeriode + 1);
    const solde = mouvements
      .filter((m) => m.date.getTime() < borne)
      .reduce((t, m) => t + montantSigne(m), soldeOuverture);
    points.push({ libelle: JOURS[j], solde, courant: false });
  }
  points[points.length - 1].courant = points.length > 1;
  return points;
}

/** Écart du solde sur la semaine : « +$102 250 · +24,8 % ». */
export function evolutionSolde(soldeOuverture: number, solde: number) {
  const ecart = solde - soldeOuverture;
  const pourcent = soldeOuverture === 0 ? null : (ecart / Math.abs(soldeOuverture)) * 100;
  const texteP =
    pourcent === null
      ? ""
      : ` · ${pourcent < 0 ? SIGNE_MOINS : "+"}${Math.abs(pourcent).toFixed(1).replace(".", ",")}${SEPARATEUR_MILLIERS}%`;
  return {
    ecart,
    hausse: ecart >= 0,
    libelle: `${formaterDollars(ecart, { signe: true })}${texteP}`,
  };
}

/** Étiquette compacte d'un point de courbe : 514 630 → « 514,6k ». */
export function formaterMilliers(n: number): string {
  const k = Math.round(n / 100) / 10;
  return `${n < 0 ? SIGNE_MOINS : ""}${String(Math.abs(k)).replace(".", ",")}k`;
}

/**
 * Graduation d'un graphique en barres : 4 intervalles « ronds » (25k pour un maximum de
 * 91,4k → 0, 25k, 50k, 75k, 100k).
 */
export function graduation(max: number, intervalles = 4): number[] {
  if (max <= 0) return Array.from({ length: intervalles + 1 }, (_, i) => i);
  const puissance = 10 ** Math.floor(Math.log10(max / intervalles));
  const pas =
    [1, 2, 2.5, 5, 10].map((f) => f * puissance).find((p) => p * intervalles >= max) ??
    10 * puissance;
  return Array.from({ length: intervalles + 1 }, (_, i) => i * pas);
}

// ── Historique ─────────────────────────────────────────────────────────────

export type MouvementHistorique = {
  numero: string;
  motif: string;
  categorie: CategorieMouvement;
  contratNumero?: string | null;
  clientNom?: string | null;
  saisiPar: string;
  justificatifNumero?: string | null;
};

const normaliser = (t: string) =>
  t
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

/** Recherche « Motif, contrat, nom… » et filtre de catégorie. */
export function filtrerHistorique<M extends MouvementHistorique>(
  mouvements: readonly M[],
  { q = "", categorie }: { q?: string; categorie?: CategorieMouvement | null },
): M[] {
  const r = normaliser(q.trim());
  return mouvements.filter(
    (m) =>
      (!categorie || m.categorie === categorie) &&
      (!r ||
        [
          numeroOperationAffiche(m.numero),
          m.motif,
          m.contratNumero,
          m.clientNom,
          m.saisiPar,
          m.justificatifNumero,
          LIBELLES_CATEGORIE[m.categorie],
        ].some((x) => x && normaliser(x).includes(r))),
  );
}

export function paginer<T>(elements: readonly T[], page: number, taille: number) {
  const pages = Math.max(1, Math.ceil(elements.length / taille));
  const courante = Math.min(Math.max(1, Math.trunc(page) || 1), pages);
  const debut = (courante - 1) * taille;
  return {
    elements: elements.slice(debut, debut + taille),
    page: courante,
    pages,
    total: elements.length,
    /** « 1–15 sur 35 » */
    libelle:
      elements.length === 0
        ? "0 sur 0"
        : `${debut + 1}–${Math.min(debut + taille, elements.length)} sur ${elements.length}`,
  };
}

/** « Reporté de S43 » si la date réelle tombe hors de la semaine d'imputation (§ 6.3). */
export function mentionReport(date: Date, semaine: SemaineFiscale, fuseau: string): string | null {
  if (contientInstant(semaine, date)) return null;
  return `Reporté de ${libelleSemaine(semaineDe(date, fuseau).numero)}`;
}
