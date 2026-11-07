"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { CodeFiliale } from "@/domaine/types";
import { libelleFiliale } from "@/domaine/filiales";
import { cx } from "@/lib/classes";
import { IconButton } from "../ui/Button";

/** Navigation principale ; sous 1024 px, repliée derrière un bouton Menu. */
export function NavSite({
  actions,
  filiales,
}: {
  actions: ReactNode;
  filiales: { code: CodeFiliale; slug: string }[];
}) {
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
          {[
            { href: "/", libelle: "Accueil" },
            ...filiales.map((f) => ({ href: `/${f.slug}`, libelle: libelleFiliale(f.code) })),
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bp-nav-lien"
              aria-current={
                (
                  l.href === "/"
                    ? chemin === "/"
                    : chemin === l.href || chemin.startsWith(`${l.href}/`)
                )
                  ? "page"
                  : undefined
              }
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
