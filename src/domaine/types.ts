// Types métier partagés. Mêmes valeurs que les enums Prisma (CONCEPTION § 4),
// redéclarés ici pour que le domaine n'importe jamais Prisma.

export type TypeVehicule = "BATEAU" | "AVION" | "HELICOPTERE";
export type StatutExemplaire = "DISPONIBLE" | "LOUE" | "MAINTENANCE";
export type StatutContrat = "EN_COURS" | "TERMINE" | "ANNULE";
export type TarifApplique = "HORAIRE" | "JOURNALIER";
export type Sens = "ENTREE" | "SORTIE";
export type CategorieMouvement =
  | "LOCATION"
  | "PENALITE"
  | "CAUTION_ENCAISSEE"
  | "CAUTION_RENDUE"
  | "ACHAT_VEHICULE"
  | "ENTRETIEN"
  | "IMPOTS"
  | "APPORT"
  | "DIVERS"
  | "FORMATION"
  | "VENTE_CARTES"
  | "ACHAT_STOCK";
/** Filiales : Location, Formation, Cards. */
export type CodeFiliale = "BPL" | "BPF" | "BPC";
export type StatutSemaine = "OUVERTE" | "CLOTUREE";
export type Role = "ADMIN" | "GESTIONNAIRE" | "FISC";

export type ForfaitDegats = { libelle: string; montant: number };

/** Erreur métier : message affichable tel quel à l'utilisateur. */
export class ErreurMetier extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErreurMetier";
  }
}
