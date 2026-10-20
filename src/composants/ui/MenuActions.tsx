"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { cx } from "@/lib/classes";
import { IconButton } from "./Button";
import { Icon, type NomIcone } from "./Icon";

export type ElementMenu = {
  libelle: string;
  icone?: NomIcone;
  onSelect: () => void;
  /** Action destructrice : ton alerte (avec icône). */
  danger?: boolean;
  desactive?: boolean;
};

/** Bouton « … » ouvrant un menu d'actions (rôle menu, flèches, Échap). */
export function MenuActions({ libelle, elements }: { libelle: string; elements: ElementMenu[] }) {
  const [ouvert, setOuvert] = useState(false);
  const zone = useRef<HTMLDivElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  useEffect(() => {
    if (!ouvert) return;
    items.current.find((b) => b && !b.disabled)?.focus();
    const fermer = (e: MouseEvent) => {
      if (!zone.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", fermer);
    return () => document.removeEventListener("mousedown", fermer);
  }, [ouvert]);

  const auClavier = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setOuvert(false);
      zone.current?.querySelector<HTMLButtonElement>("button")?.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const actifs = items.current.filter((b): b is HTMLButtonElement => !!b && !b.disabled);
    const i = actifs.indexOf(document.activeElement as HTMLButtonElement);
    actifs[(i + (e.key === "ArrowDown" ? 1 : -1) + actifs.length) % actifs.length]?.focus();
  };

  return (
    <div ref={zone} className="relative" onKeyDown={auClavier}>
      <IconButton
        libelle={libelle}
        icone="plusOptions"
        taille="tableau"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        aria-controls={id}
        onClick={() => setOuvert(!ouvert)}
      />
      {ouvert && (
        <div
          id={id}
          role="menu"
          aria-label={libelle}
          className="glass-modal absolute top-[calc(100%+6px)] right-0 z-30 flex min-w-[240px] flex-col gap-0.5 rounded-[14px] p-1.5"
        >
          {elements.map((el, i) => (
            <button
              key={el.libelle}
              ref={(b) => {
                items.current[i] = b;
              }}
              type="button"
              role="menuitem"
              disabled={el.desactive}
              onClick={() => {
                setOuvert(false);
                el.onSelect();
              }}
              className={cx(
                "flex min-h-11 cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-3 text-left text-[13.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40",
                el.danger
                  ? "text-alerte-texte hover:bg-[var(--bp-alerte-8)]"
                  : "text-texte hover:bg-[var(--bp-voile-6)]",
              )}
            >
              {(el.icone || el.danger) && <Icon nom={el.icone ?? "alerte"} taille={16} />}
              {el.libelle}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
