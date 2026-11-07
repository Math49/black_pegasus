import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { CodeFiliale } from "@/domaine/types";
import { libelleFiliale } from "@/domaine/filiales";
import { lireFiliale } from "@/services/site";
import { BoutonAppeler } from "./BoutonAppeler";
import { NumerosTelephone } from "./NumerosTelephone";
import { FONDS } from "./Mise";
import { Revelation } from "./anime/Anime";
import { ElementHero, HeroVitrine, MedaillonLogo, Surtitre } from "./Vitrine";
import { Icon } from "../ui/Icon";

type Filiale = Awaited<ReturnType<typeof lireFiliale>>;

const FONDS_HERO: Record<CodeFiliale, string> = {
  BPL: FONDS.coucher,
  BPF: FONDS.piste,
  BPC: FONDS.skyline,
};

/** Hero d'une filiale : identité, contact et actions propres à la section. */
export function HeroFiliale({ filiale: f, actions }: { filiale: Filiale; actions?: ReactNode }) {
  return (
    <HeroVitrine
      fond={FONDS_HERO[f.code]}
      visuel={
        <MedaillonLogo
          id={`anneau-${f.slug}`}
          logo={f.logo}
          alt={`Logo ${f.nom}`}
          anneau={f.nom}
          priorite
          className="mx-auto max-w-[440px] max-lg:max-w-[220px]"
        />
      }
    >
      <ElementHero>
        <Surtitre>Black Pégasus · {libelleFiliale(f.code)}</Surtitre>
      </ElementHero>
      <h1 className="m-0 titre text-[clamp(44px,6vw,88px)] leading-[1.02] font-semibold tracking-[-0.025em] text-balance">
        <Revelation delai={0.1}>{f.nom}</Revelation>
      </h1>
      <ElementHero
        as="p"
        className="m-0 max-w-[540px] text-lg leading-[1.7] text-pretty text-texte-doux"
      >
        {f.accroche}
      </ElementHero>
      <ElementHero className="glass-site flex flex-col gap-3 px-6 py-5">
        <span className="libelle">Téléphone en jeu</span>
        <NumerosTelephone
          telephone={f.telephone}
          className="texte-or text-[clamp(26px,3vw,36px)] leading-tight font-extrabold"
        />
        <span className="flex items-center gap-2.5 text-sm text-texte-doux">
          <Icon nom="horloge" taille={15} />
          {f.horaires}
        </span>
      </ElementHero>
      <ElementHero className="flex flex-wrap gap-3.5">
        <BoutonAppeler telephone={f.telephone} />
        {actions}
      </ElementHero>
    </HeroVitrine>
  );
}

/** Section d'une filiale sans catalogue en ligne (Cards en attendant F-4). */
export async function PresentationFiliale({ code }: { code: CodeFiliale }) {
  const f = await lireFiliale(code);
  if (!f.visible) notFound();
  return (
    <div data-filiale={f.slug}>
      <HeroFiliale filiale={f} />
    </div>
  );
}
