import { ErreurMetier } from "./types";

/** Séparateur de milliers : espace fine insécable (U+202F). */
export const SEPARATEUR_MILLIERS = " ";
/** Signe moins typographique (U+2212). */
export const SIGNE_MOINS = "−";

/** Montant valide : dollars entiers, positif ou nul. */
export function estMontantValide(n: unknown): n is number {
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
}

export function exigerMontant(n: unknown, libelle = "Montant"): number {
  if (!estMontantValide(n)) {
    throw new ErreurMetier(
      `${libelle} invalide : un nombre entier de dollars positif est attendu.`,
    );
  }
  return n;
}

/**
 * `$28 000`, `−$12 600`. Avec `signe: true`, les positifs sont préfixés `+` (`+$102 250`)
 * et zéro reste sans signe.
 */
export function formaterDollars(n: number, options: { signe?: boolean } = {}): string {
  if (!Number.isSafeInteger(n)) throw new ErreurMetier("Montant non entier.");
  const chiffres = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR_MILLIERS);
  const prefixe = n < 0 ? SIGNE_MOINS : options.signe && n > 0 ? "+" : "";
  return `${prefixe}$${chiffres}`;
}
