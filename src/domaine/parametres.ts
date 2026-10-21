import { ErreurMetier, type ForfaitDegats } from "./types";

// Écran « Paramètres du site » (CONCEPTION § 9.1) : règles de saisie, sans accès à la base.

/** Fuseau IANA reconnu par le moteur (« Europe/Paris », « America/Los_Angeles »…). */
export function estFuseauValide(fuseau: string): boolean {
  if (!/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+)+$|^UTC$/.test(fuseau)) return false;
  try {
    new Intl.DateTimeFormat("fr-FR", { timeZone: fuseau });
    return true;
  } catch {
    return false;
  }
}

/** Déplace l'élément `index` de `delta` rangs (bornes respectées), sans muter la liste. */
export function deplacer<T>(liste: readonly T[], index: number, delta: number): T[] {
  const cible = Math.min(Math.max(index + delta, 0), liste.length - 1);
  const copie = [...liste];
  if (index < 0 || index >= liste.length || cible === index) return copie;
  const [element] = copie.splice(index, 1);
  copie.splice(cible, 0, element);
  return copie;
}

/** Libellés de forfaits cités dans des textes par `{{forfait:Libellé}}`. */
export function forfaitsCites(textes: readonly string[]): string[] {
  const cites = new Set<string>();
  for (const t of textes)
    for (const m of t.matchAll(/\{\{\s*forfait:([^}]+)\}\}/g)) cites.add(m[1].trim());
  return [...cites];
}

/**
 * Forfaits de dégâts : libellés non vides et uniques, montants entiers positifs, et aucun
 * forfait cité par le règlement ou les textes ne doit disparaître (le texte deviendrait faux).
 */
export function verifierForfaits(forfaits: readonly ForfaitDegats[], cites: readonly string[]) {
  const vus = new Set<string>();
  for (const f of forfaits) {
    const libelle = f.libelle.trim();
    if (libelle.length < 3) throw new ErreurMetier("Forfait : libellé de 3 caractères minimum.");
    if (vus.has(libelle)) throw new ErreurMetier(`Forfait « ${libelle} » en double.`);
    if (!Number.isSafeInteger(f.montant) || f.montant < 0)
      throw new ErreurMetier(`Forfait « ${libelle} » : montant entier positif attendu.`);
    vus.add(libelle);
  }
  const manquant = cites.find((c) => !vus.has(c));
  if (manquant) {
    throw new ErreurMetier(
      `Le forfait « ${manquant} » est cité dans le règlement : modifiez d’abord le texte.`,
    );
  }
}

/** Une catégorie n'est supprimable que si aucun véhicule (même retiré) ne l'utilise. */
export function verifierSuppressionCategorie(nom: string, vehicules: number) {
  if (vehicules > 0) {
    throw new ErreurMetier(
      `« ${nom} » est utilisée par ${vehicules} véhicule${vehicules > 1 ? "s" : ""} : suppression impossible.`,
    );
  }
}

/** Majoration de retard : saisie en pourcentage entier, stockée en fraction (50 % → 0,5). */
export const majorationDepuisPourcent = (pourcent: number) => Math.round(pourcent) / 100;
export const majorationEnPourcent = (majoration: number) => Math.round(majoration * 100);
