import type { StatutExemplaire } from "./types";

// HANDOFF § 7.5.

export type Disponibilite = { libres: number; total: number; libelle: string };

export function disponibilite(exemplaires: readonly { statut: StatutExemplaire }[]): Disponibilite {
  const total = exemplaires.length;
  const libres = exemplaires.filter((e) => e.statut === "DISPONIBLE").length;
  const libelle =
    libres === 0 ? "Complet" : `${libres} / ${total} disponible${libres > 1 ? "s" : ""}`;
  return { libres, total, libelle };
}

/** Seul un exemplaire disponible peut être choisi dans un nouveau contrat. */
export const exemplaireLouable = (statut: StatutExemplaire) => statut === "DISPONIBLE";
