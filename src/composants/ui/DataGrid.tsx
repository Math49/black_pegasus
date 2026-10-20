import type { CSSProperties, ReactNode } from "react";
import { cx } from "@/lib/classes";

export type ColonneGrille<C extends string = string> = {
  cle: C;
  titre: ReactNode;
  /** Piste de grille CSS : « 112px », « minmax(150px, 1fr) »… */
  largeur: string;
  /** Les montants s'alignent à droite. */
  alignement?: "gauche" | "droite" | "centre";
  /** Titre masqué visuellement (colonne d'actions). */
  titreMasque?: boolean;
};

export type LigneGrille<C extends string = string> = {
  cle: string;
  cellules: Partial<Record<C, ReactNode>>;
  /** « alerte » : ligne teintée (retard) ; « inactif » : atténuée. */
  ton?: "alerte" | "inactif";
};

/** Tableau en grille CSS (`.gr` / `.gh` / `.gd`), rôles ARIA de tableau. */
export function DataGrid<C extends string>({
  libelle,
  colonnes,
  lignes,
  hauteurLigne,
  vide = "Aucun élément.",
  className,
}: {
  libelle: string;
  colonnes: readonly ColonneGrille<C>[];
  lignes: readonly LigneGrille<C>[];
  hauteurLigne?: number;
  vide?: ReactNode;
  className?: string;
}) {
  const style: CSSProperties = { gridTemplateColumns: colonnes.map((c) => c.largeur).join(" ") };
  const align = (c: ColonneGrille<C>) =>
    c.alignement && c.alignement !== "gauche" ? c.alignement : undefined;

  return (
    <div role="table" aria-label={libelle} className={cx("bp-grille", className)}>
      <div role="rowgroup">
        <div role="row" className="bp-gr bp-gh" style={style}>
          {colonnes.map((c) => (
            <span
              key={c.cle}
              role="columnheader"
              data-align={align(c)}
              className={c.titreMasque ? "sr-only" : undefined}
            >
              {c.titre}
            </span>
          ))}
        </div>
      </div>
      <div role="rowgroup">
        {lignes.length === 0 ? (
          <div role="row">
            <span role="cell" className="bp-grille__vide block">
              {vide}
            </span>
          </div>
        ) : (
          lignes.map((l) => (
            <div
              key={l.cle}
              role="row"
              className={cx("bp-gr bp-gd", l.ton && `bp-gd--${l.ton}`)}
              style={hauteurLigne ? { ...style, minHeight: hauteurLigne } : style}
            >
              {colonnes.map((c) => (
                <span key={c.cle} role="cell" data-align={align(c)} className="min-w-0">
                  {l.cellules[c.cle]}
                </span>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
