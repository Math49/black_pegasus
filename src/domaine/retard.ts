import { exigerMontant } from "./argent";
import { dureeMinutes } from "./dates";
import { ErreurMetier } from "./types";

// HANDOFF § 7.3. Tolérance, majoration et seuil viennent de Parametres.

export type ResultatRetard = {
  /** Minutes au-delà de l'heure prévue (0 si retour à l'heure ou anticipé). */
  minutes: number;
  heuresFacturees: number;
  penalite: number;
  /** Au-delà du seuil : défaut de restitution, à traiter manuellement. */
  defautRestitution: boolean;
};

export function calculerRetard(p: {
  finPrevue: Date;
  retourReel: Date;
  prixHeure: number;
  toleranceMin: number;
  majoration: number;
  seuilDefautRestitutionMin: number;
  fuseau: string;
}): ResultatRetard {
  exigerMontant(p.prixHeure, "Prix à l'heure");
  if (!Number.isSafeInteger(p.toleranceMin) || p.toleranceMin < 0) {
    throw new ErreurMetier("Tolérance de retard invalide.");
  }
  if (!Number.isFinite(p.majoration) || p.majoration < 0) {
    throw new ErreurMetier("Majoration de retard invalide.");
  }

  const minutes = Math.max(0, dureeMinutes(p.finPrevue, p.retourReel, p.fuseau));
  const heuresFacturees = minutes > p.toleranceMin ? Math.ceil((minutes - p.toleranceMin) / 60) : 0;
  // Arrondi au dollar : la majoration peut produire des centimes.
  const penalite = Math.round(heuresFacturees * p.prixHeure * (1 + p.majoration));

  return {
    minutes,
    heuresFacturees,
    penalite,
    defautRestitution: minutes > p.seuilDefautRestitutionMin,
  };
}

/** Minutes de dépassement d'un contrat en cours à l'instant `maintenant` (0 si à l'heure). */
export function minutesDepassement(finPrevue: Date, maintenant: Date, fuseau: string): number {
  return Math.max(0, dureeMinutes(finPrevue, maintenant, fuseau));
}

/** Un contrat en cours est en retard dès que l'heure de retour prévue est dépassée. */
export function estEnRetard(finPrevue: Date, maintenant: Date): boolean {
  return maintenant.getTime() > finPrevue.getTime();
}
