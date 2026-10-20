"use client";

import { usePathname } from "next/navigation";
import { NavItem } from "../ui/NavItem";
import type { NomIcone } from "../ui/Icon";

export type LienPanel = {
  href: string;
  libelle: string;
  icone: NomIcone;
  compteur?: string | number;
  compteurAlerte?: boolean;
};

/** Liens de la barre latérale ; l'élément actif suit l'adresse courante. */
export function NavPanel({ liens }: { liens: LienPanel[] }) {
  const chemin = usePathname();
  const actif = (href: string) =>
    href === "/admin" ? chemin === "/admin" : chemin.startsWith(href);
  return (
    <nav aria-label="Gestion" className="flex flex-col gap-1">
      <span className="px-3 pb-2 libelle text-[10.5px] tracking-[0.2em]" aria-hidden="true">
        Gestion
      </span>
      {liens.map((l) => (
        <NavItem
          key={l.href}
          href={l.href}
          icone={l.icone}
          actif={actif(l.href)}
          compteur={l.compteur}
          compteurAlerte={l.compteurAlerte}
        >
          {l.libelle}
        </NavItem>
      ))}
    </nav>
  );
}
