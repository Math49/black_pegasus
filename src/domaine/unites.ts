import { SEPARATEUR_MILLIERS } from "./argent";
import type { TypeVehicule } from "./types";

// Libellés d'affichage des caractéristiques d'un véhicule.

const TYPES: Record<TypeVehicule, { singulier: string; pluriel: string }> = {
  BATEAU: { singulier: "Bateau", pluriel: "Bateaux" },
  AVION: { singulier: "Avion", pluriel: "Avions" },
  HELICOPTERE: { singulier: "Hélicoptère", pluriel: "Hélicoptères" },
};

export const libelleType = (type: TypeVehicule, pluriel = false) =>
  pluriel ? TYPES[type].pluriel : TYPES[type].singulier;

const nombre = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR_MILLIERS);

/** « 2 places », « 1 place ». */
export const formaterPlaces = (n: number) => `${nombre(n)} place${n > 1 ? "s" : ""}`;

/** « 300 kg » ; à partir d'une tonne : « 2 t », « 1,5 t ». */
export function formaterContenance(kg: number): string {
  if (kg < 1000) return `${nombre(kg)} kg`;
  const tonnes = Math.round(kg / 100) / 10;
  return `${String(tonnes).replace(".", ",")} t`;
}
