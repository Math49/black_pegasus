import Image from "next/image";
import Link from "next/link";
import type { CSSProperties, ElementType, ReactNode } from "react";
import { cx } from "@/lib/classes";

/** Conteneur centré (`.wrap` des maquettes). */
export function Wrap({
  as: Element = "div",
  large = false,
  className,
  children,
  ...reste
}: {
  as?: ElementType;
  /** 1360 px (flotte) au lieu de 1280 px. */
  large?: boolean;
  className?: string;
  children: ReactNode;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <Element
      className={cx(
        "relative mx-auto w-full px-[clamp(16px,4vw,56px)]",
        large ? "max-w-[1360px]" : "max-w-[1280px]",
        className,
      )}
      {...reste}
    >
      {children}
    </Element>
  );
}

export const FONDS = {
  mer: "/images/bg-mer.jpg",
  piste: "/images/bg-piste-de-nuit.jpg",
  skyline: "/images/bg-skyline.jpg",
  coucher: "/images/bg-coucher-de-soleil.jpg",
} as const;

/** Visuel par défaut des cartes « Trois éléments » de l'accueil, remplaçable dans Paramètres. */
export const FONDS_TYPES = {
  BATEAU: FONDS.mer,
  AVION: FONDS.piste,
  HELICOPTERE: FONDS.skyline,
} as const;

/** Hauteur de l'en-tête (24 px de marge + pilule de 68 px) : les fonds remontent derrière lui. */
export const HAUTEUR_EN_TETE = 92;

/** Photo d'ambiance assombrie, en fond de page (derrière l'en-tête). */
export function FondAmbiance({
  image,
  hauteur,
  position = "center",
  voile,
  className,
  priorite = true,
  decalageHaut = 0,
}: {
  image: string;
  /** Hauteur en px ; absente : toute la hauteur du parent. */
  hauteur?: number;
  position?: string;
  /** Dégradés superposés (CSS), construits avec les variables de couleur. */
  voile: string;
  className?: string;
  priorite?: boolean;
  /** Remonte le fond de N px (pour passer derrière l'en-tête). */
  decalageHaut?: number;
}) {
  const style: CSSProperties = {
    top: -decalageHaut,
    ...(hauteur ? { height: hauteur + decalageHaut } : { bottom: 0 }),
  };
  return (
    <div
      aria-hidden="true"
      className={cx("pointer-events-none absolute inset-x-0 overflow-hidden", className)}
      style={style}
    >
      <Image
        src={image}
        alt=""
        fill
        priority={priorite}
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: position }}
      />
      <div className="absolute inset-0" style={{ background: voile }} />
    </div>
  );
}

/** Raccourci : noir des tokens à une opacité donnée. */
export const noir = (pourcent: number) =>
  `color-mix(in srgb, var(--bp-black) ${pourcent}%, transparent)`;

export function FilAriane({ etapes }: { etapes: { libelle: string; href?: string }[] }) {
  return (
    <nav aria-label="Fil d’Ariane" className="text-[13px] text-texte-attenue">
      <ol className="m-0 flex list-none flex-wrap gap-2.5 p-0">
        {etapes.map((e, i) => (
          <li key={i} className="flex gap-2.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {e.href ? (
              <Link href={e.href} className="text-texte-attenue hover:text-texte">
                {e.libelle}
              </Link>
            ) : (
              <span aria-current="page" className="text-texte">
                {e.libelle}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Surtitre doré + titre de section. */
export function TitreSection({
  surtitre,
  titre,
  id,
  centre = false,
  taille = "clamp(30px,3.2vw,44px)",
  children,
}: {
  surtitre: string;
  titre: ReactNode;
  id?: string;
  centre?: boolean;
  taille?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cx("flex flex-col gap-3.5", centre && "items-center text-center")}>
      <span className="libelle text-or-texte">{surtitre}</span>
      <h2 id={id} className="m-0 titre leading-[1.12] font-semibold" style={{ fontSize: taille }}>
        {titre}
      </h2>
      {children}
    </div>
  );
}
