import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/lib/transaction";

// Journal d'activité (CONCEPTION § 9.2) : chaque écriture du panel y laisse une ligne,
// dans la même transaction que l'écriture elle-même.

export async function journaliser(
  tx: Tx,
  entree: { compteId: string; action: string; cible: string; details?: Prisma.InputJsonValue },
) {
  await tx.journalAudit.create({ data: entree });
}

/** Libellés lisibles des actions du journal. */
export const LIBELLES_ACTIONS: Record<string, string> = {
  "compte.ajouter": "Compte ajouté",
  "compte.role": "Rôle modifié",
  "compte.activer": "Compte réactivé",
  "compte.desactiver": "Compte désactivé",
};
