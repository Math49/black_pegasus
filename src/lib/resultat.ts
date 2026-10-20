import "server-only";
import { z } from "zod";
import { ErreurMetier } from "@/domaine/types";

// Résultat des Server Actions : les erreurs métier et de validation remontent telles
// quelles à l'écran ; les autres sont journalisées et masquées.

export type Resultat<T = undefined> = { ok: true; donnees: T } | { ok: false; erreur: string };

export async function executer<T>(action: () => Promise<T>): Promise<Resultat<T>> {
  try {
    return { ok: true, donnees: await action() };
  } catch (e) {
    if (e instanceof ErreurMetier) return { ok: false, erreur: e.message };
    if (e instanceof z.ZodError)
      return { ok: false, erreur: e.issues[0]?.message ?? "Saisie invalide." };
    console.error(e);
    return { ok: false, erreur: "Une erreur inattendue est survenue. Réessayez." };
  }
}
