import { filigraner } from "@/lib/filigrane";
import { prisma } from "@/lib/prisma";
import { lireFichier } from "@/services/stockage";

// Photo publique d'une carte : toujours filigranée. L'original (dossier « cartes ») n'est
// servi qu'aux sessions du panel, par /api/fichiers.

const globalCache = globalThis as unknown as { filigranes?: Map<string, Buffer> };
const cache = (globalCache.filigranes ??= new Map());
const TAILLE_CACHE = 200;

export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const carte = await prisma.carte.findFirst({
    where: { id, visible: true, supprimeLe: null },
    select: { photo: true },
  });
  if (!carte?.photo) return new Response("Introuvable", { status: 404 });

  let image = cache.get(carte.photo);
  if (!image) {
    const fichier = await lireFichier(carte.photo);
    if (!fichier) return new Response("Introuvable", { status: 404 });
    image = await filigraner(fichier.contenu);
    if (cache.size >= TAILLE_CACHE) cache.delete(cache.keys().next().value!);
    cache.set(carte.photo, image);
  }

  return new Response(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // Pas d'indexation des visuels par les moteurs d'images.
      "X-Robots-Tag": "noimageindex",
      "Content-Disposition": "inline",
    },
  });
}
