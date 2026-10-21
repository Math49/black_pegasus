// Contrôle des fichiers envoyés (CONCEPTION § 7) : type réel lu dans les premiers octets,
// pas dans l'extension ni le type déclaré par le navigateur.
import { ErreurMetier } from "@/domaine/types";

export const TAILLE_MAX_FICHIER = 10 * 1024 * 1024;

export type TypeImage = {
  mime: "image/png" | "image/jpeg" | "image/webp";
  extension: "png" | "jpg" | "webp";
};

export function detecterTypeImage(octets: Uint8Array): TypeImage | null {
  const debut = (...valeurs: number[]) => valeurs.every((v, i) => octets[i] === v);
  if (debut(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))
    return { mime: "image/png", extension: "png" };
  if (debut(0xff, 0xd8, 0xff)) return { mime: "image/jpeg", extension: "jpg" };
  const ascii = (de: number, a: number) => String.fromCharCode(...octets.slice(de, a));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP")
    return { mime: "image/webp", extension: "webp" };
  return null;
}

/** Message d'erreur si le fichier n'est pas une image acceptée, sinon null. */
export function verifierImage(octets: Uint8Array): string | null {
  if (octets.length === 0) return "Fichier vide.";
  if (octets.length > TAILLE_MAX_FICHIER) return "Fichier trop lourd : 10 Mo maximum.";
  if (!detecterTypeImage(octets)) return "Format refusé : PNG, JPG ou WEBP uniquement.";
  return null;
}

export type ImageEnvoyee = { octets: Uint8Array; extension: TypeImage["extension"] };

/** Champ fichier d'un FormData → image vérifiée, ou null si aucun fichier n'est joint. */
export async function lireImageEnvoyee(
  fichier: FormDataEntryValue | null,
): Promise<ImageEnvoyee | null> {
  if (!(fichier instanceof File) || fichier.size === 0) return null;
  const octets = new Uint8Array(await fichier.arrayBuffer());
  const erreur = verifierImage(octets);
  if (erreur) throw new ErreurMetier(erreur);
  return { octets, extension: detecterTypeImage(octets)!.extension };
}
