import "server-only";
import { connection } from "next/server";

/**
 * Instant présent côté serveur. En développement, `HORLOGE_DEMO` (ISO UTC) fige l'horloge sur
 * l'instant des maquettes pour que les données de démonstration restent cohérentes.
 * Ignoré en production.
 */
export async function maintenant(): Promise<Date> {
  await connection();
  const demo = process.env.NODE_ENV !== "production" ? process.env.HORLOGE_DEMO : undefined;
  if (demo) {
    const d = new Date(demo);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
