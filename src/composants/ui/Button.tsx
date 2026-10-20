import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from "react";
import { cx } from "@/lib/classes";
import { Icon, type NomIcone } from "./Icon";

export type VarianteBouton = "or" | "verre" | "danger";
export type TailleBouton = "site" | "site-petit" | "panel" | "panel-petit";

type Commun = {
  variante?: VarianteBouton;
  taille?: TailleBouton;
  icone?: NomIcone;
  iconeFin?: NomIcone;
  children: ReactNode;
  className?: string;
};

type PropsLien = Commun & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "href" | "className" | "children"
  >;
type PropsBouton = Commun & { href?: undefined } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "children"
  >;

const tailleIcone = (taille: TailleBouton) => (taille.startsWith("site") ? 20 : 18);

/** Bouton principal (or), secondaire (verre) ou destructif. Lien si `href` est fourni. */
export function Button(props: PropsLien | PropsBouton) {
  const {
    variante = "or",
    taille = "site",
    icone,
    iconeFin,
    children,
    className,
    ...reste
  } = props;
  const classes = cx("bp-btn", `bp-btn--${variante}`, `bp-btn--${taille}`, className);
  const t = tailleIcone(taille);
  const contenu = (
    <>
      {icone && <Icon nom={icone} taille={t} />}
      {children}
      {iconeFin && <Icon nom={iconeFin} taille={t} />}
    </>
  );

  if ("href" in reste && reste.href !== undefined) {
    return (
      <Link {...(reste as Omit<PropsLien, keyof Commun>)} className={classes}>
        {contenu}
      </Link>
    );
  }
  const { type = "button", ...attributs } = reste as Omit<PropsBouton, keyof Commun>;
  return (
    <button type={type} {...attributs} className={classes}>
      {contenu}
    </button>
  );
}

export type VarianteBoutonIcone = "verre" | "or" | "danger";
export type TailleBoutonIcone = "panel" | "tableau" | "rond";

type CommunIcone = {
  /** Obligatoire : nom accessible du bouton. */
  libelle: string;
  icone: NomIcone;
  variante?: VarianteBoutonIcone;
  taille?: TailleBoutonIcone;
  className?: string;
};

/** Bouton icône carré (panel, tableau) ou rond (site). */
export function IconButton(
  props:
    | (CommunIcone & { href: string } & Omit<
          ComponentProps<typeof Link>,
          "href" | "className" | "children"
        >)
    | (CommunIcone & { href?: undefined } & Omit<
          ButtonHTMLAttributes<HTMLButtonElement>,
          "className" | "children"
        >),
) {
  const { libelle, icone, variante = "verre", taille = "panel", className, ...reste } = props;
  const classes = cx(
    "bp-ibtn",
    `bp-ibtn--${variante}`,
    `bp-ibtn--${taille}`,
    taille === "tableau" && "bp-cible",
    className,
  );
  const contenu = <Icon nom={icone} taille={taille === "tableau" ? 16 : 18} />;

  if ("href" in reste && reste.href !== undefined) {
    return (
      <Link
        {...(reste as { href: string })}
        aria-label={libelle}
        title={libelle}
        className={classes}
      >
        {contenu}
      </Link>
    );
  }
  const { type = "button", ...attributs } = reste as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button type={type} {...attributs} aria-label={libelle} title={libelle} className={classes}>
      {contenu}
    </button>
  );
}

/** Lien texte doré suivi d'une flèche. */
export function LienTexte({
  href,
  children,
  icone = "flecheDroite",
  className,
}: {
  href: string;
  children: ReactNode;
  icone?: NomIcone;
  className?: string;
}) {
  return (
    <Link href={href} className={cx("bp-lien", className)}>
      {children}
      <Icon nom={icone} trait={1.5} className="text-or-icone" />
    </Link>
  );
}
