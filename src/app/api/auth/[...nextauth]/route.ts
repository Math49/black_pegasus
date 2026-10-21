import type { NextRequest } from "next/server";
import { handlers } from "@/lib/auth";
import { connexionAutorisee } from "@/lib/limites";

// Routes Auth.js (redirection et retour OAuth Discord), limitées par adresse IP.
const trop = () =>
  new Response("Trop de tentatives de connexion : patientez une minute.", {
    status: 429,
    headers: { "Retry-After": "60" },
  });

export async function GET(requete: NextRequest) {
  return (await connexionAutorisee(requete.headers)) ? handlers.GET(requete) : trop();
}

export async function POST(requete: NextRequest) {
  return (await connexionAutorisee(requete.headers)) ? handlers.POST(requete) : trop();
}
