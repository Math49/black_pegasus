"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CodeFiliale } from "@/domaine/types";
import { libelleFiliale } from "@/domaine/filiales";
import { cx } from "@/lib/classes";
import { Button, IconButton } from "../ui/Button";
import { BarreSite, LogoSite } from "./BarreSite";

/** Navigation principale ; sous 1024 px, repliée derrière un bouton Menu. */
export function NavSite({
  nomGroupe,
  filiales,
}: {
  nomGroupe: string;
  filiales: { code: CodeFiliale; slug: string; nom: string; logo: string }[];
}) {
  const chemin = usePathname();
  const [ouvert, setOuvert] = useState(false);
  const filiale = filiales.find((f) => chemin === `/${f.slug}` || chemin.startsWith(`/${f.slug}/`));
  const accueil = filiale ? `/${filiale.slug}` : "/";
  const liens = filiale
    ? [
        { href: accueil, libelle: "Accueil" },
        ...(filiale.code === "BPL"
          ? [
              { href: "/location/flotte", libelle: "La flotte" },
              { href: "/location/reglement", libelle: "Règlement" },
            ]
          : []),
      ]
    : [
        { href: "/", libelle: "Accueil" },
        ...filiales.map((f) => ({ href: `/${f.slug}`, libelle: libelleFiliale(f.code) })),
      ];

  return (
    <BarreSite filiale={filiale?.slug}>
      <LogoSite
        nom={filiale?.nom ?? nomGroupe}
        logo={filiale?.logo ?? "/images/logos/bp-compagnie.webp"}
        href={accueil}
      />
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
          {liens.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="bp-nav-lien"
              aria-current={
                (
                  l.href === accueil
                    ? chemin === accueil
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
        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            href="/admin/connexion"
            variante="verre"
            taille="site-petit"
            icone="cadenas"
            className="min-h-[46px]"
          >
            Espace admin
          </Button>
          {filiale && (
            <Button
              href="/"
              variante="verre"
              taille="site-petit"
              icone="flecheGauche"
              className="min-h-[46px]"
              onClick={() => setOuvert(false)}
            >
              Retour au groupe
            </Button>
          )}
        </div>
      </div>
    </BarreSite>
  );
}
