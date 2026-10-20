import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

// Stockage des fichiers sur disque (volume /data). Interface remplaçable par S3 plus tard.
// Les clés sont relatives : « photos/xxx.jpg », « justificatifs/xxx.png ».

// turbopackIgnore : chemins connus seulement à l'exécution (volume de stockage).
const racine = () => path.resolve(/*turbopackIgnore: true*/ process.env.STOCKAGE_DIR ?? "./data");

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/** Chemin absolu d'une clé, ou null si elle sort du dossier de stockage. */
export function cheminDeCle(cle: string): string | null {
  if (!cle || cle.includes("\0")) return null;
  const base = racine();
  const chemin = path.resolve(/*turbopackIgnore: true*/ base, cle);
  return chemin.startsWith(base + path.sep) ? chemin : null;
}

export async function lireFichier(cle: string): Promise<{ contenu: Buffer; type: string } | null> {
  const chemin = cheminDeCle(cle);
  const type = TYPES[path.extname(cle).toLowerCase()];
  if (!chemin || !type) return null;
  try {
    return { contenu: await readFile(/*turbopackIgnore: true*/ chemin), type };
  } catch {
    return null;
  }
}

/** Enregistre un fichier sous un nom aléatoire et renvoie sa clé (« photos/3f2a….png »). */
export async function enregistrerFichier(
  dossier: "photos" | "justificatifs" | "pdf",
  contenu: Uint8Array,
  extension: string,
) {
  const cle = `${dossier}/${randomUUID()}.${extension}`;
  const chemin = cheminDeCle(cle)!;
  await mkdir(path.dirname(/*turbopackIgnore: true*/ chemin), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ chemin, contenu);
  return cle;
}

/** Supprime un fichier (sans erreur s'il n'existe plus). */
export async function supprimerFichier(cle: string) {
  const chemin = cheminDeCle(cle);
  if (chemin) await rm(/*turbopackIgnore: true*/ chemin, { force: true });
}

/** URL publique d'une photo de véhicule. */
export const urlPhoto = (cle: string | null) =>
  cle
    ? `/api/fichiers/${cle.split("/").map(encodeURIComponent).join("/")}`
    : "/images/vehicule-placeholder.jpg";
