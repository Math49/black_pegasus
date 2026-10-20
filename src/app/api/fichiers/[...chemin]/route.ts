import { lireFichier } from "@/services/stockage";

// Fichiers stockés. Seules les photos de véhicules sont publiques ; les justificatifs
// et PDF seront servis aux sessions valides (phases 5, 8 et 9).
const PUBLICS = new Set(["photos"]);

export async function GET(
  _requete: Request,
  { params }: { params: Promise<{ chemin: string[] }> },
) {
  const { chemin } = await params;
  if (!PUBLICS.has(chemin[0] ?? "")) return new Response("Introuvable", { status: 404 });

  const fichier = await lireFichier(chemin.join("/"));
  if (!fichier) return new Response("Introuvable", { status: 404 });

  return new Response(new Uint8Array(fichier.contenu), {
    headers: {
      "Content-Type": fichier.type,
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
