import { TZDate } from "@date-fns/tz";
import {
  addDays,
  addWeeks,
  getISOWeek,
  getISOWeekYear,
  getISOWeeksInYear,
  startOfISOWeek,
} from "date-fns";
import { libelleSemaine } from "./numerotation";
import { ErreurMetier } from "./types";

// Semaine fiscale = semaine ISO, du lundi 00:00 au lundi suivant 00:00 (borne exclusive),
// à l'heure du serveur (HANDOFF § 7.6, CONCEPTION § 4 et § 6.3).

export type SemaineFiscale = {
  /** « 2026-S43 » */
  id: string;
  annee: number;
  numero: number;
  /** Lundi 00:00 heure serveur, en UTC. */
  debut: Date;
  /** Lundi suivant 00:00 heure serveur, en UTC (exclu). */
  fin: Date;
};

export const idSemaine = (annee: number, numero: number) => `${annee}-${libelleSemaine(numero)}`;

export function lireIdSemaine(id: string): { annee: number; numero: number } {
  const m = /^(\d{4})-S(\d{2})$/.exec(id);
  if (!m) throw new ErreurMetier(`Semaine invalide : « ${id} ».`);
  return { annee: Number(m[1]), numero: Number(m[2]) };
}

function depuisLundi(lundi: TZDate): SemaineFiscale {
  const annee = getISOWeekYear(lundi);
  const numero = getISOWeek(lundi);
  return {
    id: idSemaine(annee, numero),
    annee,
    numero,
    debut: new Date(lundi.getTime()),
    fin: new Date(addWeeks(lundi, 1).getTime()),
  };
}

/** Semaine fiscale contenant l'instant donné. */
export function semaineDe(instant: Date, fuseau: string): SemaineFiscale {
  return depuisLundi(startOfISOWeek(new TZDate(instant.getTime(), fuseau)));
}

export function semaineParNumero(annee: number, numero: number, fuseau: string): SemaineFiscale {
  const quatreJanvier = new TZDate(annee, 0, 4, fuseau); // toujours en semaine 1
  if (!Number.isSafeInteger(numero) || numero < 1 || numero > getISOWeeksInYear(quatreJanvier)) {
    throw new ErreurMetier(`L'année ${annee} n'a pas de semaine ${numero}.`);
  }
  return depuisLundi(addWeeks(startOfISOWeek(quatreJanvier), numero - 1));
}

export function semaineParId(id: string, fuseau: string): SemaineFiscale {
  const { annee, numero } = lireIdSemaine(id);
  return semaineParNumero(annee, numero, fuseau);
}

export const semaineSuivante = (s: SemaineFiscale, fuseau: string) => semaineDe(s.fin, fuseau);

export const semainePrecedente = (s: SemaineFiscale, fuseau: string) =>
  semaineDe(new Date(s.debut.getTime() - 1), fuseau);

export const contientInstant = (s: SemaineFiscale, instant: Date) =>
  instant.getTime() >= s.debut.getTime() && instant.getTime() < s.fin.getTime();

/**
 * Instant à partir duquel la semaine peut être clôturée : `heuresAvantFin` heures d'horloge
 * avant le lundi suivant 00:00 (24 → dimanche 00:00, valeur par défaut de la décision D4).
 */
export function ouvertureCloture(s: SemaineFiscale, heuresAvantFin: number, fuseau: string): Date {
  if (!Number.isSafeInteger(heuresAvantFin) || heuresAvantFin < 0 || heuresAvantFin > 168) {
    throw new ErreurMetier("Délai d'ouverture de la clôture invalide.");
  }
  const lundiSuivant = new TZDate(s.fin.getTime(), fuseau);
  const jours = Math.floor(heuresAvantFin / 24);
  const heures = heuresAvantFin % 24;
  const d = addDays(lundiSuivant, -jours);
  d.setHours(d.getHours() - heures);
  return new Date(d.getTime());
}

/**
 * Semaine d'imputation d'un mouvement (CONCEPTION § 6.3) : celle de sa date si elle est ouverte,
 * sinon la première semaine ouverte suivante. `reporteDe` indique la semaine d'origine.
 */
export function semaineImputation(
  date: Date,
  fuseau: string,
  estCloturee: (idSemaine: string) => boolean,
): { semaine: SemaineFiscale; reporteDe: SemaineFiscale | null } {
  const origine = semaineDe(date, fuseau);
  let semaine = origine;
  for (let i = 0; estCloturee(semaine.id); i++) {
    if (i >= 520) throw new ErreurMetier("Aucune semaine ouverte trouvée.");
    semaine = semaineSuivante(semaine, fuseau);
  }
  return { semaine, reporteDe: semaine.id === origine.id ? null : origine };
}
