import "server-only";
import { readFile } from "node:fs/promises";
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

/** URL publique d'une photo de véhicule. */
export const urlPhoto = (cle: string | null) =>
  cle
    ? `/api/fichiers/${cle.split("/").map(encodeURIComponent).join("/")}`
    : "/images/vehicule-placeholder.jpg";
