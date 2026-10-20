import { formaterDollars } from "./argent";
import type { ForfaitDegats } from "./types";

// Variables des textes éditables (Paramètres) : {{telephone}}, {{horaires}},
// {{toleranceRetardMin}}, {{majorationRetardPourcent}}, {{seuilDefautRestitutionHeures}},
// {{forfait:<libellé>}}. Les valeurs viennent toujours de Parametres.

export type ContexteTextes = {
  telephone: string;
  horaires: string;
  toleranceRetardMin: number;
  majorationRetard: number;
  seuilDefautRestitutionMin: number;
  forfaitsDegats: readonly ForfaitDegats[];
};

export type Segment =
  | { type: "texte"; valeur: string }
  /** Le numéro est mis en avant (or) à l'affichage. */
  | { type: "telephone"; valeur: string };

const nombreFr = (n: number) => String(Math.round(n * 100) / 100).replace(".", ",");

function valeurVariable(nom: string, ctx: ContexteTextes): Segment | null {
  if (nom === "telephone") return { type: "telephone", valeur: ctx.telephone };
  const texte = (valeur: string): Segment => ({ type: "texte", valeur });
  switch (nom) {
    case "horaires":
      return texte(ctx.horaires);
    case "toleranceRetardMin":
      return texte(nombreFr(ctx.toleranceRetardMin));
    case "majorationRetardPourcent":
      return texte(nombreFr(ctx.majorationRetard * 100));
    case "seuilDefautRestitutionHeures":
      return texte(nombreFr(ctx.seuilDefautRestitutionMin / 60));
  }
  if (nom.startsWith("forfait:")) {
    const libelle = nom.slice("forfait:".length).trim();
    const forfait = ctx.forfaitsDegats.find((f) => f.libelle === libelle);
    return forfait ? texte(formaterDollars(forfait.montant)) : null;
  }
  return null;
}

/** Découpe un texte en segments, variables remplacées. Une variable inconnue reste telle quelle. */
export function segmenterTexte(texte: string, ctx: ContexteTextes): Segment[] {
  const segments: Segment[] = [];
  const ajouter = (s: Segment) => {
    const dernier = segments.at(-1);
    if (s.type === "texte" && dernier?.type === "texte") dernier.valeur += s.valeur;
    else if (s.valeur !== "") segments.push(s);
  };
  let curseur = 0;
  for (const m of texte.matchAll(/\{\{\s*([^}]+?)\s*\}\}/g)) {
    ajouter({ type: "texte", valeur: texte.slice(curseur, m.index) });
    ajouter(valeurVariable(m[1], ctx) ?? { type: "texte", valeur: m[0] });
    curseur = m.index + m[0].length;
  }
  ajouter({ type: "texte", valeur: texte.slice(curseur) });
  return segments;
}

/** Remplace les variables et renvoie du texte brut (métadonnées, attributs). */
export const texteBrut = (texte: string, ctx: ContexteTextes) =>
  segmenterTexte(texte, ctx)
    .map((s) => s.valeur)
    .join("");

/** Titre avec passage mis en avant entre astérisques : « Le ciel, *à votre mesure* ». */
export function decouperTitre(titre: string): { texte: string; accent: boolean }[] {
  return titre
    .split(/(\*[^*]+\*)/)
    .filter(Boolean)
    .map((partie) =>
      partie.startsWith("*") && partie.endsWith("*") && partie.length > 2
        ? { texte: partie.slice(1, -1), accent: true }
        : { texte: partie, accent: false },
    );
}
