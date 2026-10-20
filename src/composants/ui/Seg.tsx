"use client";

import Link from "next/link";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/classes";

export type OptionSeg = { valeur: string; libelle: ReactNode; compteur?: ReactNode; href?: string };

/**
 * Onglets segmentés. Site : segment actif en or ; panel : verre clair.
 * Avec des `href`, rend des liens (filtres dans l'URL) ; sinon des onglets clavier (flèches).
 */
export function Seg({
  options,
  valeur,
  onChange,
  libelle,
  variante = "panel",
  className,
}: {
  options: readonly OptionSeg[];
  valeur: string;
  onChange?: (valeur: string) => void;
  /** Nom accessible du groupe. */
  libelle: string;
  variante?: "site" | "panel";
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enLiens = options.every((o) => o.href);
  const conteneur = cx(
    "bp-segs",
    `bp-segs--${variante}`,
    variante === "site" && "glass-site",
    className,
  );
  const classeSeg = (actif: boolean) =>
    cx("bp-seg", `bp-seg--${variante}`, actif && "bp-seg--actif");
  const contenu = (o: OptionSeg) => (
    <>
      {o.libelle}
      {o.compteur !== undefined && <span className="bp-seg__compteur">{o.compteur}</span>}
    </>
  );

  if (enLiens) {
    return (
      <nav aria-label={libelle} className={conteneur}>
        {options.map((o) => (
          <Link
            key={o.valeur}
            href={o.href!}
            aria-current={o.valeur === valeur ? "true" : undefined}
            className={classeSeg(o.valeur === valeur)}
          >
            {contenu(o)}
          </Link>
        ))}
      </nav>
    );
  }

  const auClavier = (e: KeyboardEvent, index: number) => {
    const sens = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!sens) return;
    e.preventDefault();
    const suivant = (index + sens + options.length) % options.length;
    refs.current[suivant]?.focus();
    onChange?.(options[suivant].valeur);
  };

  return (
    <div role="tablist" aria-label={libelle} className={conteneur}>
      {options.map((o, i) => {
        const actif = o.valeur === valeur;
        return (
          <button
            key={o.valeur}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={actif}
            tabIndex={actif ? 0 : -1}
            onClick={() => onChange?.(o.valeur)}
            onKeyDown={(e) => auClavier(e, i)}
            className={classeSeg(actif)}
          >
            {contenu(o)}
          </button>
        );
      })}
    </div>
  );
}

/** Pilules de filtre (boutons à bascule `aria-pressed`). */
export function Pilules({
  options,
  valeur,
  onChange,
  libelle,
  className,
}: {
  options: readonly { valeur: string; libelle: ReactNode }[];
  valeur: string;
  onChange?: (valeur: string) => void;
  libelle: string;
  className?: string;
}) {
  return (
    <div role="group" aria-label={libelle} className={cx("flex flex-wrap gap-2", className)}>
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          aria-pressed={o.valeur === valeur}
          onClick={() => onChange?.(o.valeur)}
          className="bp-pilule bp-cible"
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}
