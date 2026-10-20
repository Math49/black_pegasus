import { exigerMontant } from "./argent";
import type { ForfaitDegats } from "./types";

// HANDOFF § 7.4 : pénalité de dégâts = somme des forfaits cochés à la clôture.
export function totalDegats(forfaitsCoches: readonly ForfaitDegats[]): number {
  return forfaitsCoches.reduce((total, f) => total + exigerMontant(f.montant, f.libelle), 0);
}
