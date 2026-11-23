"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { cx } from "@/lib/classes";
import { NavItem } from "../ui/NavItem";
import type { NomIcone } from "../ui/Icon";

export type LienPanel = {
  href: string;
  libelle: string;
  icone: NomIcone;
  compteur?: string | number;
  compteurAlerte?: boolean;
  groupe?: string;
};

/** Liens de la barre latérale ; l'élément actif suit l'adresse courante. */
export function NavPanel({ liens }: { liens: LienPanel[] }) {
  const chemin = usePathname();
  // Lien actif : le plus long préfixe de l'adresse (« Ventes » plutôt que « Cartes »).
  const correspond = (href: string) =>
    href === "/admin" ? chemin === "/admin" : chemin === href || chemin.startsWith(`${href}/`);
  const actifHref = liens
    .filter((l) => correspond(l.href))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  const actif = (href: string) => href === actifHref;
  return (
    <nav aria-label="Menu du panel" className="flex flex-col gap-1">
      {liens.map((l, i) => (
        <Fragment key={l.href}>
          {l.groupe && l.groupe !== liens[i - 1]?.groupe && (
            <span
              className={cx("px-3 pb-2 libelle text-[10.5px] tracking-[0.2em]", i > 0 && "mt-4")}
            >
              {l.groupe}
            </span>
          )}
          <NavItem
            href={l.href}
            icone={l.icone}
            actif={actif(l.href)}
            compteur={l.compteur}
            compteurAlerte={l.compteurAlerte}
          >
            {l.libelle}
          </NavItem>
        </Fragment>
      ))}
    </nav>
  );
}
