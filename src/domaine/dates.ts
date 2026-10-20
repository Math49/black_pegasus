import { TZDate, tzOffset } from "@date-fns/tz";
import { ErreurMetier } from "./types";

// Les instants sont stockés en UTC. Les durées facturées (location, retard) se comptent
// sur l'heure affichée du serveur : 22:00 → 10:00 = 12 h, même la nuit du changement
// d'heure (décision du client, 20/10/2026 ; HANDOFF § 7.8, maquette 17).

const FORMAT_LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** Instant UTC → date manipulable dans le fuseau du serveur (getHours() = heure affichée). */
export function versHeureServeur(instant: Date, fuseau: string): TZDate {
  return new TZDate(instant.getTime(), fuseau);
}

/** Heure affichée du serveur (« 2026-10-24T21:40 ») → instant UTC. */
export function depuisHeureServeur(texte: string, fuseau: string): Date {
  const m = FORMAT_LOCAL.exec(texte);
  if (!m) throw new ErreurMetier(`Date invalide : « ${texte} ».`);
  const [a, mo, j, h, mi, s] = m.slice(1).map((v) => (v === undefined ? 0 : Number(v)));
  const joursDuMois = new Date(Date.UTC(a, mo, 0)).getUTCDate();
  if (mo < 1 || mo > 12 || j < 1 || j > joursDuMois || h > 23 || mi > 59 || s > 59) {
    throw new ErreurMetier(`Date invalide : « ${texte} ».`);
  }
  return new Date(new TZDate(a, mo - 1, j, h, mi, s, fuseau).getTime());
}

/** Instant UTC → « 2026-10-24T21:40 » à l'heure du serveur (champs datetime-local). */
export function formaterHeureServeurIso(instant: Date, fuseau: string): string {
  const d = versHeureServeur(instant, fuseau);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** Millisecondes « horloge murale » : l'heure affichée lue comme si elle était UTC. */
function msHorloge(instant: Date, fuseau: string): number {
  return instant.getTime() + tzOffset(fuseau, instant) * 60_000;
}

/**
 * Durée en minutes entières (secondes tronquées) entre deux instants, comptée sur l'heure
 * affichée du serveur. Négative si `b` précède `a`.
 */
export function dureeMinutes(a: Date, b: Date, fuseau: string): number {
  const ms = msHorloge(b, fuseau) - msHorloge(a, fuseau);
  return Math.trunc(ms / 60_000) || 0; // || 0 : évite -0
}

/** Date calendaire « 2026-10-20 » → « 20/10/2026 » (date saisie, sans fuseau). */
export function formaterDateCourte(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) throw new ErreurMetier(`Date invalide : « ${iso} ».`);
  return `${m[3]}/${m[2]}/${m[1]}`;
}
