// Markdown restreint des textes éditables (règlement, descriptions de véhicules).
// Blocs séparés par une ligne vide :
//   **1.1** texte     → clause numérotée
//   > texte           → encadré
//   | a | b |         → tableau (première ligne : en-têtes, deuxième : séparateur)
//   ## Titre          → intertitre
//   texte             → paragraphe
// En ligne : **gras**, [lien](/chemin), et les variables {{…}} (domaine/textes.ts).

export type Bloc =
  | { type: "clause"; numero: string; texte: string }
  | { type: "encadre"; texte: string }
  | { type: "tableau"; entetes: string[]; lignes: string[][] }
  | { type: "titre"; texte: string }
  | { type: "paragraphe"; texte: string };

const cellules = (ligne: string) =>
  ligne
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((c) => c.trim());

export function lireBlocs(source: string): Bloc[] {
  return source
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((bloc): Bloc => {
      const clause = /^\*\*(\d+(?:\.\d+)*)\*\*\s+([\s\S]+)$/.exec(bloc);
      if (clause) return { type: "clause", numero: clause[1], texte: clause[2].trim() };
      if (bloc.startsWith(">")) {
        return { type: "encadre", texte: bloc.replace(/^>\s?/gm, "").trim() };
      }
      if (bloc.startsWith("## ")) return { type: "titre", texte: bloc.slice(3).trim() };
      const lignes = bloc.split("\n");
      if (lignes.length >= 2 && lignes.every((l) => l.trim().startsWith("|"))) {
        const [entete, separateur, ...corps] = lignes;
        const avecSeparateur = /^\|?[\s:|-]+\|?$/.test(separateur.trim());
        return {
          type: "tableau",
          entetes: cellules(entete),
          lignes: (avecSeparateur ? corps : [separateur, ...corps]).map(cellules),
        };
      }
      return { type: "paragraphe", texte: bloc.replace(/\s*\n\s*/g, " ") };
    });
}

export type Morceau =
  | { type: "texte"; texte: string }
  | { type: "gras"; texte: string }
  | { type: "lien"; texte: string; href: string };

/** Découpe une ligne en texte, gras et liens. Les liens externes ou `javascript:` sont refusés. */
export function lireEnLigne(texte: string): Morceau[] {
  const morceaux: Morceau[] = [];
  let curseur = 0;
  for (const m of texte.matchAll(/\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g)) {
    if (m.index > curseur) morceaux.push({ type: "texte", texte: texte.slice(curseur, m.index) });
    if (m[1] !== undefined) morceaux.push({ type: "gras", texte: m[1] });
    else if (/^(\/(?!\/)|#)/.test(m[3])) morceaux.push({ type: "lien", texte: m[2], href: m[3] });
    else morceaux.push({ type: "texte", texte: m[2] });
    curseur = m.index + m[0].length;
  }
  if (curseur < texte.length) morceaux.push({ type: "texte", texte: texte.slice(curseur) });
  return morceaux;
}
