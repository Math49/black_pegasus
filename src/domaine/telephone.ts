import { z } from "zod";

// Téléphone en jeu, commun aux formulaires publics (enchères, demandes de formation).

/** Trois chiffres, un tiret, quatre chiffres (555-0123). */
export const TELEPHONE_EN_JEU = /^\d{3}-\d{4}$/;

export const MESSAGE_TELEPHONE = "Téléphone : format 000-0000 (ex. 555-0123).";

/** Champ « téléphone en jeu » : obligatoire, au format 000-0000. */
export const schemaTelephoneEnJeu = z
  .string({ error: "Téléphone : obligatoire." })
  .trim()
  .regex(TELEPHONE_EN_JEU, MESSAGE_TELEPHONE);

/** Met en forme la saisie : « 5550123 » → « 555-0123 » (chiffres seulement, 7 au plus). */
export function formaterTelephoneEnJeu(saisie: string): string {
  const chiffres = saisie.replace(/\D/g, "").slice(0, 7);
  return chiffres.length > 3 ? `${chiffres.slice(0, 3)}-${chiffres.slice(3)}` : chiffres;
}
