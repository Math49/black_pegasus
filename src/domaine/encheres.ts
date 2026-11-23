import { z } from "zod";
import { formaterDollars } from "./argent";
import { schemaTelephoneEnJeu } from "./telephone";
import { ErreurMetier } from "./types";

// Enchères de cartes (REFONTE-ADMIN § 5). Fonctions pures : montants entiers, dates en UTC.

const MINUTE = 60_000;
const HEURE = 60 * MINUTE;

export type ParametresEnchere = {
  montantDepart: number;
  pasMinimum: number;
  dureeHeures: number;
  tempsAdditionnelMin: number;
};

/** Bornes des paramètres d'une enchère. */
export const BORNES_ENCHERE = {
  montantDepart: { min: 1, max: 10_000_000 },
  pasMinimum: { min: 1, max: 1_000_000 },
  dureeHeures: { min: 1, max: 720 },
  tempsAdditionnelMin: { min: 0, max: 1440 },
} as const;

const LIBELLES_PARAMETRES: Record<keyof ParametresEnchere, string> = {
  montantDepart: "Montant de départ",
  pasMinimum: "Pas minimum",
  dureeHeures: "Durée (heures)",
  tempsAdditionnelMin: "Temps additionnel (minutes)",
};

export function verifierParametresEnchere(p: ParametresEnchere): void {
  for (const cle of Object.keys(BORNES_ENCHERE) as (keyof ParametresEnchere)[]) {
    const { min, max } = BORNES_ENCHERE[cle];
    const v = p[cle];
    if (cle === "dureeHeures" && (!Number.isSafeInteger(v) || v < min || v > max))
      throw new ErreurMetier("Durée : entre 1 heure et 30 jours.");
    if (!Number.isSafeInteger(v) || v < min || v > max)
      throw new ErreurMetier(
        `${LIBELLES_PARAMETRES[cle]} : nombre entier entre ${min.toLocaleString("fr-FR")} et ${max.toLocaleString("fr-FR")}.`,
      );
  }
}

export const finInitiale = (debut: Date, dureeHeures: number) =>
  new Date(debut.getTime() + dureeHeures * HEURE);

/** Unités proposées pour saisir la durée d'une enchère (stockée en heures). */
export const UNITES_DUREE = { heures: 1, jours: 24 } as const;
export type UniteDuree = keyof typeof UNITES_DUREE;

/** Durée saisie (valeur + unité) → heures. */
export const dureeEnHeures = (valeur: number, unite: UniteDuree) => valeur * UNITES_DUREE[unite];

/** « 10 j », « 36 h » → « 1 j 12 h », « 1 h ». */
export function formaterDureeEnchere(heures: number): string {
  const j = Math.floor(heures / 24);
  const h = heures % 24;
  if (j === 0) return `${h} h`;
  return h === 0 ? `${j} j` : `${j} j ${h} h`;
}

export type PhaseEnchere = { phase: "duree" | "additionnel" | "terminee"; fin: Date };

/**
 * Phase affichée : d'abord la durée choisie à la création ; si des offres tardives ont
 * prolongé l'enchère au-delà, le temps additionnel prend le relais jusqu'à la fin prévue.
 */
export function phaseEnchere(
  e: { debut: Date; dureeHeures: number; finPrevue: Date },
  maintenant: Date,
): PhaseEnchere {
  const finDuree = finInitiale(e.debut, e.dureeHeures);
  const t = maintenant.getTime();
  if (t < finDuree.getTime()) return { phase: "duree", fin: finDuree };
  if (t < e.finPrevue.getTime()) return { phase: "additionnel", fin: e.finPrevue };
  return { phase: "terminee", fin: e.finPrevue };
}

type Offre = { montant: number; date: Date; invalidee: boolean };

/** Offres retenues (non écartées), de la meilleure à la moins bonne. */
export const offresValides = <O extends Offre>(offres: readonly O[]): O[] =>
  offres
    .filter((o) => !o.invalidee)
    .sort((a, b) => b.montant - a.montant || a.date.getTime() - b.date.getTime());

/** Meilleure offre retenue, ou null. */
export const meilleureOffre = <O extends Offre>(offres: readonly O[]): O | null =>
  offresValides(offres)[0] ?? null;

/** Montant minimum de la prochaine offre : le départ, puis la meilleure offre + le pas. */
export function montantMinimum(
  enchere: Pick<ParametresEnchere, "montantDepart" | "pasMinimum">,
  offres: readonly Offre[],
): number {
  const meilleure = meilleureOffre(offres);
  return meilleure ? meilleure.montant + enchere.pasMinimum : enchere.montantDepart;
}

/**
 * Prolongation : une offre arrivée alors qu'il reste moins que le temps additionnel repousse
 * la fin à l'heure de l'offre + le temps additionnel. Sinon la fin ne change pas.
 */
export const nouvelleFin = (finPrevue: Date, dateOffre: Date, tempsAdditionnelMin: number) =>
  new Date(Math.max(finPrevue.getTime(), dateOffre.getTime() + tempsAdditionnelMin * MINUTE));

export type StatutEnchere = "OUVERTE" | "CONCLUE" | "ANNULEE";
export type EtatEnchere = "en_cours" | "a_conclure" | "sans_offre" | "conclue" | "annulee";

/** État affiché : une enchère ouverte dont la fin est passée attend sa conclusion. */
export function etatEnchere(
  e: { statut: StatutEnchere; finPrevue: Date },
  offres: readonly Offre[],
  maintenant: Date,
): EtatEnchere {
  if (e.statut === "CONCLUE") return "conclue";
  if (e.statut === "ANNULEE") return "annulee";
  if (maintenant.getTime() < e.finPrevue.getTime()) return "en_cours";
  return meilleureOffre(offres) ? "a_conclure" : "sans_offre";
}

export const LIBELLES_ETAT_ENCHERE: Record<EtatEnchere, string> = {
  en_cours: "En cours",
  a_conclure: "Terminée · à conclure",
  sans_offre: "Terminée sans offre",
  conclue: "Conclue",
  annulee: "Annulée",
};

/** Schéma d'une offre publique : coordonnées en jeu uniquement. */
export const schemaOffre = z.object({
  nom: z
    .string({ error: "Nom RP : obligatoire." })
    .trim()
    .min(2, "Nom : 2 caractères minimum.")
    .max(60, "Nom : 60 caractères maximum."),
  telephone: schemaTelephoneEnJeu,
  montant: z
    .string({ error: "Montant : obligatoire." })
    .transform((t) => t.replace(/[\s  $]/g, ""))
    .pipe(z.string().regex(/^\d{1,9}$/, "Montant : nombre entier de dollars."))
    .transform(Number),
});

/** Refuse une offre sur une enchère fermée ou terminée, ou sous le minimum. */
export function verifierOffre(
  enchere: { statut: StatutEnchere; finPrevue: Date } & Pick<
    ParametresEnchere,
    "montantDepart" | "pasMinimum"
  >,
  offres: readonly Offre[],
  montant: number,
  maintenant: Date,
): void {
  if (enchere.statut !== "OUVERTE" || maintenant.getTime() >= enchere.finPrevue.getTime())
    throw new ErreurMetier("Cette enchère est terminée.");
  if (!Number.isSafeInteger(montant) || montant < 1)
    throw new ErreurMetier("Montant : nombre entier de dollars.");
  const minimum = montantMinimum(enchere, offres);
  if (montant < minimum)
    throw new ErreurMetier(`Votre offre doit être d’au moins ${formaterDollars(minimum)}.`);
}

/** Dernière heure d'une enchère : signal « Se termine bientôt » sur le catalogue. */
export const SEUIL_FIN_PROCHE_MS = 60 * MINUTE;

export type SignalEnchere = "en_cours" | "fin_proche" | "terminee";

/** Pastille d'une enchère selon le temps restant jusqu'à la fin prévue. */
export function signalEnchere(restantMs: number): SignalEnchere {
  if (restantMs <= 0) return "terminee";
  return restantMs <= SEUIL_FIN_PROCHE_MS ? "fin_proche" : "en_cours";
}

/** Temps restant compact : « 2 j 5 h », « 3 h 12 min », « 4 min 08 s », « Terminée ». */
export function formaterTempsRestant(ms: number): string {
  if (ms <= 0) return "Terminée";
  const s = Math.floor(ms / 1000);
  const j = Math.floor(s / 86_400);
  const h = Math.floor((s % 86_400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (j > 0) return h > 0 ? `${j} j ${h} h` : `${j} j`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} min`;
  return `${m} min ${String(sec).padStart(2, "0")} s`;
}
