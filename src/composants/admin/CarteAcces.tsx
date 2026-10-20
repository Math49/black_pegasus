import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { FONDS } from "../site/Mise";
import { Icon } from "../ui/Icon";

const noir = (p: number) => `color-mix(in srgb, var(--bp-black) ${p}%, transparent)`;

/** Carte de verre centrée sur fond de coucher de soleil (connexion, accès refusé). */
export function CarteAcces({
  surtitre,
  titre,
  texte,
  children,
}: {
  surtitre: string;
  titre: string;
  texte: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-noir px-5 py-12">
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src={FONDS.coucher}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
          style={{ objectPosition: "center 62%" }}
        />
        <div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(60% 70% at 50% 50%, ${noir(35)}, ${noir(88)} 100%)`,
          }}
        />
      </div>
      <div className="relative flex w-full max-w-[460px] flex-col items-center gap-7">
        <div className="glass-site flex w-full flex-col items-center gap-[22px] rounded-[24px] px-10 pt-11 pb-9 text-center max-sm:px-6">
          <Image
            src="/images/bp-logo.png"
            alt="Black Pégasus – American Transports"
            width={148}
            height={148}
            priority
            className="object-contain"
          />
          <div className="flex flex-col items-center gap-2.5">
            <span className="libelle text-or-texte">{surtitre}</span>
            <h1 className="m-0 titre text-[30px] font-semibold">{titre}</h1>
            <p className="m-0 max-w-[320px] text-[15px] leading-[1.6] text-texte-doux">{texte}</p>
          </div>
          {children}
        </div>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2.5 text-sm font-semibold text-texte-doux hover:text-texte"
        >
          <Icon nom="flecheGauche" taille={18} />
          Retour au site public
        </Link>
      </div>
    </main>
  );
}

/** Encadré d'information sous le bouton. */
export function NoteAcces({
  icone = "cadenas",
  children,
}: {
  icone?: "cadenas" | "information" | "alerte";
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-4)] px-4 py-3.5 text-left">
      <Icon nom={icone} taille={18} className="mt-px text-argent-1" />
      <span className="text-[13px] leading-[1.55] text-texte-doux">{children}</span>
    </div>
  );
}
