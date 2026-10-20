import type { StatutExemplaire } from "./types";

// Règles de la flotte côté panel (maquettes 14 et 15).

/** « SuperVolito Carbon » → « supervolito-carbon ». */
export function slugifier(nom: string): string {
  return (
    nom
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "vehicule"
  );
}

/** Slug libre : « toro2 », sinon « toro2-2 », « toro2-3 »… */
export function slugUnique(base: string, pris: ReadonlySet<string>): string {
  if (!pris.has(base)) return base;
  for (let n = 2; ; n++) if (!pris.has(`${base}-${n}`)) return `${base}-${n}`;
}

/** « bp sh  01 » → « BP SH 01 ». */
export const normaliserImmatriculation = (texte: string) =>
  texte.trim().replace(/\s+/g, " ").toUpperCase();

export type CompteursFlotte = {
  modeles: number;
  exemplaires: number;
  disponibles: number;
  loues: number;
  maintenance: number;
};

export function compteursFlotte(
  vehicules: readonly { exemplaires: readonly { statut: StatutExemplaire }[] }[],
): CompteursFlotte {
  const tous = vehicules.flatMap((v) => v.exemplaires);
  const compter = (s: StatutExemplaire) => tous.filter((e) => e.statut === s).length;
  return {
    modeles: vehicules.length,
    exemplaires: tous.length,
    disponibles: compter("DISPONIBLE"),
    loues: compter("LOUE"),
    maintenance: compter("MAINTENANCE"),
  };
}

/** Erreur de saisie de la liste d'exemplaires, ou null. */
export function verifierExemplaires(immatriculations: readonly string[]): string | null {
  const normalisees = immatriculations.map(normaliserImmatriculation);
  if (normalisees.some((i) => i === "")) return "Chaque exemplaire doit avoir une immatriculation.";
  if (normalisees.some((i) => i.length > 20))
    return "Immatriculation trop longue (20 caractères maximum).";
  const doublon = normalisees.find((i, k) => normalisees.indexOf(i) !== k);
  return doublon ? `L’immatriculation ${doublon} est saisie deux fois.` : null;
}
