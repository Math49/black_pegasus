import "server-only";
import { connection } from "next/server";

const globalHorloge = globalThis as unknown as { departHorlogeBp?: number };

/**
 * Instant présent côté serveur. En développement, `HORLOGE_DEMO` (ISO UTC) cale l'horloge sur
 * l'instant des maquettes pour que les données de démonstration restent cohérentes :
 * - figée sur cet instant (par défaut, utilisé par les tests e2e) ;
 * - ou, avec `HORLOGE_DEMO_AVANCE=1`, partant de cet instant au démarrage du serveur puis
 *   avançant normalement (minuteurs d'enchères réalistes en développement).
 * Ignoré en production.
 */
export async function maintenant(): Promise<Date> {
  await connection();
  const demo = process.env.NODE_ENV !== "production" ? process.env.HORLOGE_DEMO : undefined;
  if (demo) {
    const d = new Date(demo);
    if (!Number.isNaN(d.getTime())) {
      if (process.env.HORLOGE_DEMO_AVANCE !== "1") return d;
      const depart = (globalHorloge.departHorlogeBp ??= Date.now());
      return new Date(d.getTime() + (Date.now() - depart));
    }
  }
  return new Date();
}
