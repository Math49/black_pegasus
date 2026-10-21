import { prisma } from "@/lib/prisma";

// Sonde du conteneur (HEALTHCHECK) : l'application répond et joint la base.
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ etat: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ etat: "base injoignable" }, { status: 503 });
  }
}
