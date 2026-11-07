import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/lib/classes";
import { Icon } from "../ui/Icon";
import { Apparition, Cascade, ElementCascade, Parallaxe } from "./anime/Anime";
import { HAUTEUR_EN_TETE, noir } from "./Mise";

/** Halos colorés (accent de la section) qui dérivent derrière un hero. */
export function Aurores({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      <span className="bp-aurore top-[8%] left-[-10%] size-[46vw] max-w-[640px] bg-[var(--bp-or-22)]" />
      <span className="bp-aurore bp-aurore--lente right-[-12%] bottom-[-10%] size-[40vw] max-w-[560px] bg-[var(--bp-or-10)]" />
    </div>
  );
}

/** Logo en médaillon : halo, anneaux et texte circulaire qui tourne lentement. */
export function MedaillonLogo({
  id,
  logo,
  alt,
  anneau,
  className,
  priorite = false,
}: {
  /** Identifiant unique du tracé circulaire. */
  id: string;
  logo: string;
  alt: string;
  /** Texte répété sur l'anneau. */
  anneau: string;
  className?: string;
  priorite?: boolean;
}) {
  const texte = `${anneau} · `.repeat(Math.max(1, Math.ceil(70 / (anneau.length + 3))));
  return (
    <div className={cx("relative aspect-square w-full", className)}>
      <div
        aria-hidden="true"
        className="absolute inset-[12%] rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--bp-or-30), transparent)" }}
      />
      <svg viewBox="0 0 400 400" aria-hidden="true" className="bp-anneau">
        <defs>
          <path id={id} d="M200,200 m-180,0 a180,180 0 1,1 360,0 a180,180 0 1,1 -360,0" />
        </defs>
        <circle cx="200" cy="200" r="196" fill="none" stroke="var(--bp-or-30)" strokeWidth="1" />
        <circle cx="200" cy="200" r="158" fill="none" stroke="var(--bp-trait-12)" strokeWidth="1" />
        <text
          fill="var(--bp-accent-texte)"
          fontSize="13"
          fontWeight="700"
          letterSpacing="5"
          style={{ fontFamily: "var(--bp-font-display)" }}
        >
          <textPath href={`#${id}`} textLength={1125} lengthAdjust="spacing">
            {texte.toUpperCase()}
          </textPath>
        </text>
      </svg>
      <Image
        src={logo}
        alt={alt}
        width={400}
        height={400}
        priority={priorite}
        className="absolute inset-[17%] size-[66%] rounded-full object-contain"
      />
    </div>
  );
}

/** Hero plein écran : fond en parallaxe qui se resserre lentement, halos, indice de défilement. */
export function HeroVitrine({
  fond,
  position = "center",
  children,
  visuel,
  className,
}: {
  fond: string;
  position?: string;
  children: ReactNode;
  visuel?: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("relative isolate flex min-h-[min(100svh,980px)] flex-col", className)}>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 -z-10 overflow-hidden"
        style={{ top: -HAUTEUR_EN_TETE }}
      >
        <Parallaxe amplitude={160}>
          <Image
            src={fond}
            alt=""
            fill
            priority
            sizes="100vw"
            className="bp-zoom-lent object-cover"
            style={{ objectPosition: position }}
          />
        </Parallaxe>
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(90deg, ${noir(94)} 0%, ${noir(72)} 45%, ${noir(40)} 100%), linear-gradient(180deg, ${noir(30)} 0%, transparent 30%, transparent 60%, var(--bp-black) 100%)`,
          }}
        />
        <Aurores />
      </div>
      <div className="relative mx-auto grid w-full max-w-[1280px] flex-1 grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] items-center gap-12 px-[clamp(16px,4vw,56px)] pt-12 pb-28 max-lg:grid-cols-1 max-lg:gap-10 max-lg:pt-8">
        <Cascade immediat className="flex min-w-0 flex-col items-start gap-7">
          {children}
        </Cascade>
        {visuel && <div className="bp-entree-visuel min-w-0 max-lg:order-first">{visuel}</div>}
      </div>
      <div
        aria-hidden="true"
        className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-3 max-md:hidden"
      >
        <span className="libelle text-[10px] text-texte-attenue">Défiler</span>
        <span className="bp-indice-defilement" />
      </div>
    </section>
  );
}

/** Surtitre avec filet, en tête de hero ou de section. */
export function Surtitre({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("flex items-center gap-3.5", className)}>
      <span className="h-px w-10 fond-or" aria-hidden="true" />
      <span className="libelle text-or-texte">{children}</span>
    </span>
  );
}

export { ElementCascade as ElementHero };

/** Bandeau de mots qui défile en continu (pause au survol). */
export function Defilant({ mots, className }: { mots: string[]; className?: string }) {
  const piste = (cache: boolean) => (
    <div className="bp-defilant__piste" aria-hidden={cache || undefined}>
      {mots.map((m, i) => (
        <span key={i} className="flex items-center gap-[clamp(28px,4vw,56px)]">
          <span
            className={cx(
              "titre text-[clamp(36px,6vw,84px)] leading-none font-bold whitespace-nowrap uppercase",
              i % 2 ? "bp-texte-contour" : "texte-or",
            )}
          >
            {m}
          </span>
          <svg viewBox="0 0 24 24" className="size-6 flex-none text-or-icone" aria-hidden="true">
            <path
              d="M12 0l2.6 9.4L24 12l-9.4 2.6L12 24l-2.6-9.4L0 12l9.4-2.6z"
              fill="currentColor"
            />
          </svg>
        </span>
      ))}
    </div>
  );
  return (
    <div className={cx("bp-defilant py-8", className)}>
      {piste(false)}
      {piste(true)}
    </div>
  );
}

export type Panneau = {
  cle: string;
  href: string;
  titre: string;
  surtitre: string;
  texte?: string;
  /** Photo de fond ; sinon un dégradé de l'accent. */
  fond?: string;
  logo?: string;
  /** Attribut data-filiale : colore le panneau avec l'accent de la filiale. */
  filiale?: string;
  pied?: ReactNode;
  action: string;
};

/** Panneaux côte à côte ; sur grand écran, celui survolé s'élargit et dévoile son texte. */
export function Panneaux({
  panneaux,
  hauteur = "h-[min(620px,78vh)]",
  extensibles = true,
}: {
  panneaux: Panneau[];
  hauteur?: string;
  extensibles?: boolean;
}) {
  return (
    <Cascade
      className={cx(
        "bp-panneaux",
        extensibles && panneaux.length > 1 && "bp-panneaux--extensibles",
      )}
    >
      {panneaux.map((p, i) => (
        <ElementCascade
          key={p.cle}
          filiale={p.filiale}
          className={cx("bp-panneau max-lg:min-h-[440px]", hauteur)}
        >
          <Link href={p.href} className="absolute inset-0 text-texte">
            <span className="bp-panneau__fond absolute inset-0 -z-10" aria-hidden="true">
              {p.fond ? (
                <Image
                  src={p.fond}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                />
              ) : (
                <span
                  className="absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(80% 60% at 70% 20%, var(--bp-or-35), transparent 70%), radial-gradient(60% 50% at 10% 90%, var(--bp-or-22), transparent 70%), var(--bp-surface)",
                  }}
                />
              )}
              <span
                className="absolute inset-0"
                style={{
                  background: `linear-gradient(180deg, ${noir(25)} 0%, ${noir(10)} 35%, ${noir(92)} 100%)`,
                }}
              />
            </span>
            <span className="absolute top-6 left-7 titre text-[15px] font-bold tracking-[0.2em] text-or-texte">
              {String(i + 1).padStart(2, "0")}
            </span>
            {p.logo && (
              <Image
                src={p.logo}
                alt=""
                width={84}
                height={84}
                className="absolute top-5 right-5 size-[72px] rounded-full bg-noir object-contain ring-1 ring-[var(--bp-or-35)]"
              />
            )}
            <span className="absolute inset-x-0 bottom-0 flex flex-col gap-4 p-7">
              <span className="libelle text-or-texte">{p.surtitre}</span>
              <h3 className="m-0 titre text-[clamp(26px,2.4vw,34px)] leading-[1.1] font-semibold">
                {p.titre}
              </h3>
              {(p.texte || p.pied) && (
                <span className="bp-panneau__detail">
                  <span className="flex min-h-0 flex-col gap-4 overflow-hidden">
                    {p.texte && (
                      <span className="max-w-[440px] text-[15px] leading-relaxed text-texte-doux">
                        {p.texte}
                      </span>
                    )}
                    {p.pied}
                  </span>
                </span>
              )}
              <span className="flex items-center gap-3 font-bold text-or-texte">
                {p.action}
                <span className="bp-panneau__fleche flex size-11 items-center justify-center rounded-full text-noir fond-or">
                  <Icon nom="flecheDroite" taille={18} trait={1.8} />
                </span>
              </span>
            </span>
          </Link>
        </ElementCascade>
      ))}
    </Cascade>
  );
}

/** En-tête de section : surtitre, grand titre et texte facultatif. */
export function EnTeteSection({
  id,
  surtitre,
  titre,
  children,
  centre = false,
  className,
}: {
  id: string;
  surtitre: string;
  titre: ReactNode;
  children?: ReactNode;
  centre?: boolean;
  className?: string;
}) {
  return (
    <Apparition
      className={cx("flex flex-col gap-5", centre && "items-center text-center", className)}
    >
      <Surtitre>{surtitre}</Surtitre>
      <h2
        id={id}
        className="m-0 max-w-[820px] titre text-[clamp(34px,4.4vw,64px)] leading-[1.04] font-semibold text-balance"
      >
        {titre}
      </h2>
      {children}
    </Apparition>
  );
}
