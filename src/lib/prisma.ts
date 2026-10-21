import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { urlBase } from "./urlBase";

// Une seule instance par processus (évite d'épuiser les connexions en dev avec le rechargement à chaud).
const globalPourPrisma = globalThis as unknown as { prisma?: PrismaClient };

function creerClient() {
  const adapter = new PrismaPg({ connectionString: urlBase() });
  return new PrismaClient({ adapter });
}

export const prisma = globalPourPrisma.prisma ?? creerClient();

if (process.env.NODE_ENV !== "production") globalPourPrisma.prisma = prisma;
