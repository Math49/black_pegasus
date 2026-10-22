import { ErreurMetier } from "./types";
import { format } from "date-fns";
import { versHeureServeur } from "./dates";

/** Identifiant Discord (« snowflake ») : 17 à 20 chiffres. */
export const estIdentifiantDiscord = (texte: string) => /^\d{17,20}$/.test(texte.trim());

const jourServeur = (instant: Date, fuseau: string) =>
  format(versHeureServeur(instant, fuseau), "yyyy-MM-dd");

/**
 * Dernière connexion relative (maquette 21) : « En ligne » pour soi, « Il y a 40 min »,
 * « Il y a 2 h » le jour même, « Hier, 23:10 », puis la date.
 */
export function formaterDerniereConnexion(
  derniere: Date | null,
  maintenant: Date,
  fuseau: string,
  estMoi = false,
): string {
  if (estMoi) return "En ligne";
  if (!derniere) return "Jamais connecté";
  const minutes = Math.floor((maintenant.getTime() - derniere.getTime()) / 60_000);
  if (minutes < 1) return "À l’instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  if (jourServeur(derniere, fuseau) === jourServeur(maintenant, fuseau)) {
    return `Il y a ${Math.floor(minutes / 60)} h`;
  }
  const veille = versHeureServeur(maintenant, fuseau);
  veille.setDate(veille.getDate() - 1);
  if (jourServeur(derniere, fuseau) === format(veille, "yyyy-MM-dd")) {
    return `Hier, ${format(versHeureServeur(derniere, fuseau), "HH:mm")}`;
  }
  return format(versHeureServeur(derniere, fuseau), "dd/MM/yyyy");
}

/**
 * Nom d'un compte partout dans l'application (PDF, registre, en-tête) : le nom RP s'il est
 * renseigné, sinon le nom Discord, sinon le pseudo.
 */
export const nomCompte = (c: {
  nomRp?: string | null;
  nomAffiche: string;
  pseudo: string;
  discordId: string;
}) => c.nomRp?.trim() || c.nomAffiche || c.pseudo || `Compte ${c.discordId}`;

/** Nom RP saisi par un administrateur : espaces normalisés, 2 à 60 caractères (vide accepté). */
export function normaliserNomRp(nom: string): string {
  const n = nom.trim().replace(/\s+/g, " ");
  if (n && (n.length < 2 || n.length > 60)) {
    throw new ErreurMetier("Nom RP : 2 à 60 caractères.");
  }
  return n;
}
