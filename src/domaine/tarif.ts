import { exigerMontant } from "./argent";
import { dureeMinutes } from "./dates";
import { ErreurMetier, type TarifApplique } from "./types";

// HANDOFF § 7.1. Même fonction côté navigateur (récapitulatif) et côté serveur (enregistrement).

export type ResultatTarif = {
  /** Heures facturées : toute heure entamée est due, minimum 1. */
  heures: number;
  horaire: number;
  journalier: number;
  montant: number;
  tarifApplique: TarifApplique;
  /** Économie pour le client quand le journalier s'applique, sinon 0. */
  economie: number;
};

export function tarifPourHeures(
  heures: number,
  prixHeure: number,
  prixJour: number,
): ResultatTarif {
  if (!Number.isSafeInteger(heures) || heures < 1) throw new ErreurMetier("Durée invalide.");
  exigerMontant(prixHeure, "Prix à l'heure");
  exigerMontant(prixJour, "Prix à la journée");

  const jours = Math.floor(heures / 24);
  const reste = heures % 24;
  const horaire = heures * prixHeure;
  const journalier = jours * prixJour + Math.min(reste * prixHeure, prixJour);
  const journalierApplique = journalier < horaire;

  return {
    heures,
    horaire,
    journalier,
    montant: journalierApplique ? journalier : horaire,
    tarifApplique: journalierApplique ? "JOURNALIER" : "HORAIRE",
    economie: journalierApplique ? horaire - journalier : 0,
  };
}

export function calculerTarif(p: {
  debut: Date;
  fin: Date;
  prixHeure: number;
  prixJour: number;
  fuseau: string;
}): ResultatTarif {
  if (p.fin.getTime() <= p.debut.getTime()) {
    throw new ErreurMetier("La fin prévue doit être postérieure au début.");
  }
  const minutes = dureeMinutes(p.debut, p.fin, p.fuseau);
  const heures = Math.max(1, Math.ceil(minutes / 60));
  return tarifPourHeures(heures, p.prixHeure, p.prixJour);
}

/**
 * Nombre d'heures à partir duquel le tarif journalier devient avantageux sur une location
 * de moins de 24 h (formulaire véhicule). `null` si jamais avant 24 h.
 */
export function seuilJournalierHeures(prixHeure: number, prixJour: number): number | null {
  exigerMontant(prixHeure, "Prix à l'heure");
  exigerMontant(prixJour, "Prix à la journée");
  if (prixHeure === 0) return null;
  const seuil = Math.floor(prixJour / prixHeure) + 1;
  return seuil < 24 ? seuil : null;
}
