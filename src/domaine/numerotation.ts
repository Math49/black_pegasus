import { ErreurMetier } from "./types";

// HANDOFF § 7.7 et CONCEPTION § 6.4.

const pad = (n: number, largeur: number) => {
  if (!Number.isSafeInteger(n) || n < 1) throw new ErreurMetier("Numéro de séquence invalide.");
  return String(n).padStart(largeur, "0");
};

/**
 * Clé du compteur annuel des contrats de Black Pégasus Location : `BPL-2026`. Les contrats
 * antérieurs aux filiales gardent leur numéro `CTR-2026-…` ; la séquence continue.
 */
export const cleCompteurContrats = (annee: number) => `BPL-${annee}`;

/** `BPL-2026-0042` */
export const numeroContrat = (annee: number, n: number) => `BPL-${annee}-${pad(n, 4)}`;

/** `OP-43-007` (numéro affiché) */
/** Compteur annuel des ventes de Black Pégasus Cards : `BPC-2026`. */
export const cleCompteurVentes = (annee: number) => `BPC-${annee}`;

/** N° de vente : `BPC-2026-0001`. */
export const numeroVente = (annee: number, n: number) => `BPC-${annee}-${pad(n, 4)}`;

export const numeroOperation = (semaine: number, n: number) => `OP-${pad(semaine, 2)}-${pad(n, 3)}`;

/** `2026-OP-43-007` : numéro unique en base, préfixé de l'année ISO. */
export const numeroOperationEnBase = (annee: number, semaine: number, n: number) =>
  `${annee}-${numeroOperation(semaine, n)}`;

/** `JUST-43-03` */
export const numeroJustificatif = (semaine: number, n: number) =>
  `JUST-${pad(semaine, 2)}-${pad(n, 2)}`;

/** `DEC-2026-S43` */
export const numeroDeclaration = (annee: number, semaine: number) =>
  `DEC-${annee}-S${pad(semaine, 2)}`;

/** `S43` */
export const libelleSemaine = (semaine: number) => `S${pad(semaine, 2)}`;

/** Lit `OP-43-007` ou `2026-OP-43-007`. */
export function lireNumeroOperation(numero: string): { semaine: number; n: number } | null {
  const m = /^(?:\d{4}-)?OP-(\d{2,})-(\d{3,})$/.exec(numero);
  return m ? { semaine: Number(m[1]), n: Number(m[2]) } : null;
}

/** Retire le préfixe d'année : `2026-OP-43-007` → `OP-43-007`. */
export const numeroOperationAffiche = (numero: string) => numero.replace(/^\d{4}-/, "");
