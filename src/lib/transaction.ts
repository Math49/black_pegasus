import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export type Tx = Prisma.TransactionClient;

/** Conflit d'écriture : P2034, ou 40001 remonté par une requête brute (P2010). */
function estConflit(e: unknown): boolean {
  const erreur = e as {
    code?: string;
    meta?: { driverAdapterError?: { cause?: { originalCode?: string; kind?: string } } };
  };
  if (erreur.code === "P2034") return true;
  const cause = erreur.meta?.driverAdapterError?.cause;
  return cause?.originalCode === "40001" || cause?.kind === "TransactionWriteConflict";
}

/**
 * Transaction `Serializable` (CONCEPTION § 6) relancée automatiquement si Postgres signale un
 * conflit de sérialisation entre deux écritures concurrentes.
 */
export async function enTransaction<T>(travail: (tx: Tx) => Promise<T>, essais = 5): Promise<T> {
  for (let essai = 1; ; essai++) {
    try {
      return await prisma.$transaction(travail, {
        isolationLevel: "Serializable",
        timeout: 15_000,
      });
    } catch (e) {
      if (!estConflit(e) || essai >= essais) throw e;
      // Attente croissante et aléatoire : laisse la transaction concurrente se terminer.
      await new Promise((r) => setTimeout(r, 40 * essai + Math.random() * 60));
    }
  }
}
