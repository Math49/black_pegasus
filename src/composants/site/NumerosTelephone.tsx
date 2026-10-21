import { Fragment } from "react";
import { numerosTelephone } from "@/domaine/textes";
import { cx } from "@/lib/classes";

/**
 * Numéro(s) en jeu de l'agence. Un numéro ne se coupe jamais ; plusieurs numéros passent à
 * la ligne quand la place manque (carte étroite, mobile). Les classes de couleur et de taille
 * (texte-or, text-[34px]…) se donnent via `className`.
 */
export function NumerosTelephone({
  telephone,
  className,
}: {
  telephone: string;
  className?: string;
}) {
  const numeros = numerosTelephone(telephone);
  return (
    <span
      className={cx(
        "inline-flex max-w-full flex-wrap items-baseline gap-x-[0.3em] tabular-nums",
        className,
      )}
    >
      {numeros.map((n, i) => (
        <Fragment key={n + i}>
          {i > 0 && (
            <span aria-hidden="true" className="opacity-60">
              /
            </span>
          )}
          {i > 0 && <span className="sr-only"> ou </span>}
          <span className="whitespace-nowrap">{n}</span>
        </Fragment>
      ))}
    </span>
  );
}
