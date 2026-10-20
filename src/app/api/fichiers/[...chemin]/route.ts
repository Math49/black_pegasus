import { lireCompteConnecte } from "@/lib/garde";
import { lireFichier } from "@/services/stockage";

// Fichiers stockés : photos de véhicules publiques ; justificatifs et PDF réservés aux
// sessions valides (CONCEPTION § 7).
const PUBLICS = new Set(["photos"]);
const PRIVES = new Set(["justificatifs", "pdf"]);

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ chemin: string[] }> },
) {
  const { chemin } = await params;
  const dossier = chemin[0] ?? "";
  if (!PUBLICS.has(dossier) && !PRIVES.has(dossier))
    return new Response("Introuvable", { status: 404 });
  if (PRIVES.has(dossier) && !(await lireCompteConnecte())) {
    return new Response("Accès refusé", { status: 401 });
  }

  const fichier = await lireFichier(chemin.join("/"));
  if (!fichier) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(fichier.contenu), {
    headers: {
      "Content-Type": fichier.type,
      "Cache-Control": PRIVES.has(dossier) ? "private, no-store" : "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
