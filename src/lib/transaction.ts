import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";

export type Tx = Prisma.TransactionClient;

/**
 * Transaction `Serializable` (CONCEPTION § 6) relancée automatiquement si Postgres signale un
 * conflit de sérialisation entre deux écritures concurrentes.
 */
export async function enTransaction<T>(travail: (tx: Tx) => Promise<T>, essais = 3): Promise<T> {
  for (let essai = 1; ; essai++) {
    try {
      return await prisma.$transaction(travail, {
        isolationLevel: "Serializable",
        timeout: 15_000,
      });
    } catch (e) {
      const conflit = (e as { code?: string }).code === "P2034";
      if (!conflit || essai >= essais) throw e;
    }
  }
}
