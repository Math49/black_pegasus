"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cx } from "@/lib/classes";
import { IconButton } from "../ui/Button";

const LIENS = [
  { href: "/", libelle: "Accueil", actif: (p: string) => p === "/" },
  { href: "/flotte", libelle: "La flotte", actif: (p: string) => p.startsWith("/flotte") },
  { href: "/reglement", libelle: "Règlement", actif: (p: string) => p.startsWith("/reglement") },
  { href: "/#maison", libelle: "La maison", actif: () => false },
];

/** Navigation principale ; sous 1024 px, repliée derrière un bouton Menu. */
export function NavSite({ actions }: { actions: ReactNode }) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <IconButton
        libelle={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        icone={ouvert ? "fermer" : "plusOptions"}
        aria-expanded={ouvert}
        aria-controls="menu-site"
        onClick={() => setOuvert(!ouvert)}
        className="rounded-full lg:hidden"
      />
      <div
        id="menu-site"
        className={cx(
          "w-full flex-col gap-4 pb-2 lg:contents",
          ouvert ? "flex" : "hidden lg:contents",
        )}
      >
        <nav
          aria-label="Navigation principale"
          className="flex flex-col gap-x-[30px] lg:flex-row lg:flex-wrap"
        >
          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bp-nav-lien"
              aria-current={l.actif(chemin) ? "page" : undefined}
              onClick={() => setOuvert(false)}
            >
              {l.libelle}
            </Link>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-2.5">{actions}</div>
      </div>
    </>
  );
}
