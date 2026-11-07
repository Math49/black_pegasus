import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Filigrane des photos de cartes (Black Pégasus Cards) : le logo Cards répété en diagonale,
// incrusté dans l'image servie au public. L'original n'est jamais exposé hors du panel.
// Le motif est un SVG avec image intégrée : aucune police n'est nécessaire dans le conteneur.

const LARGEUR_MAX = 900;
const OPACITE = 0.22;

let logo: Promise<string> | undefined;

/** Logo Cards en PNG base64, lu une seule fois. */
function logoBase64() {
  logo ??= readFile(
    path.join(/*turbopackIgnore: true*/ process.cwd(), "public/images/logos/bp-cards.webp"),
  )
    .then((octets) => sharp(octets).resize(160).png().toBuffer())
    .then((png) => png.toString("base64"));
  return logo;
}

/** Image filigranée (WebP), redimensionnée à 900 px de large au plus. */
export async function filigraner(original: Buffer): Promise<Buffer> {
  const image = sharp(original).rotate().resize({ width: LARGEUR_MAX, withoutEnlargement: true });
  const { data, info } = await image.toBuffer({ resolveWithObject: true });
  const { width, height } = info;
  const pas = Math.max(120, Math.round(Math.min(width, height) / 3));
  const motif = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <defs>
    <pattern id="f" width="${pas}" height="${pas}" patternUnits="userSpaceOnUse"
      patternTransform="rotate(-30)">
      <image href="data:image/png;base64,${await logoBase64()}" x="${pas * 0.15}" y="${pas * 0.15}"
        width="${pas * 0.7}" height="${pas * 0.7}" opacity="${OPACITE}"/>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#f)"/>
</svg>`;
  return sharp(data)
    .composite([{ input: Buffer.from(motif), top: 0, left: 0 }])
    .webp({ quality: 82 })
    .toBuffer();
}
