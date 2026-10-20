import type { Metadata } from "next";
import { Suspense } from "react";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import {
  FilAriane,
  FONDS,
  FondAmbiance,
  HAUTEUR_EN_TETE,
  noir,
  Wrap,
} from "@/composants/site/Mise";
import { SommaireReglement } from "@/composants/site/SommaireReglement";
import { TexteEnLigne, TexteRiche } from "@/composants/site/Texte";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon } from "@/composants/ui/Icon";
import { formaterDateCourte } from "@/domaine/dates";
import { lireParametresSite } from "@/services/site";

export const metadata: Metadata = {
  title: "Règlement des locations",
  description:
    "Conditions de location, tarification, caution, retards, dégâts et restitution : les règles qui s’appliquent à chaque contrat Black Pégasus.",
  openGraph: {
    title: "Règlement des locations · Black Pégasus",
    images: ["/images/bg-piste-de-nuit.jpg"],
  },
};

async function Reglement() {
  const p = await lireParametresSite();
  const { reglement } = p;
  const date = reglement.dateMiseAJour ? formaterDateCourte(reglement.dateMiseAJour) : "[DATE]";

  return (
    <>
      <FondAmbiance
        image={FONDS.piste}
        position="center 45%"
        hauteur={620}
        decalageHaut={HAUTEUR_EN_TETE}
        voile={`linear-gradient(180deg, ${noir(50)} 0%, ${noir(60)} 50%, var(--bp-black) 100%)`}
      />

      <Wrap className="z-10 flex flex-col gap-[18px] pt-20 pb-16">
        <FilAriane etapes={[{ libelle: "Accueil", href: "/" }, { libelle: "Règlement" }]} />
        <h1 className="m-0 titre text-[clamp(38px,4.4vw,60px)] leading-[1.06] font-semibold">
          Règlement des <span className="texte-or font-bold">locations</span>
        </h1>
        <p className="m-0 max-w-[620px] text-[17px] leading-[1.6] text-texte-doux">
          <TexteEnLigne texte={reglement.introduction} ctx={p} />
        </p>
        <span className="inline-flex items-center gap-2.5 text-[13px] text-texte-attenue">
          <Icon nom="calendrier" taille={15} />
          Dernière mise à jour : {date}
        </span>
      </Wrap>

      <Wrap className="z-10 flex flex-wrap items-start gap-14 pb-[120px]">
        <GlassCard
          as="aside"
          aria-label="Sommaire et contact"
          variante="site"
          className="flex w-full flex-col gap-1 rounded-[22px] px-3.5 py-[22px] lg:sticky lg:top-6 lg:max-w-[300px] lg:flex-[1_1_260px]"
        >
          <span className="px-3 pb-3 libelle text-texte-doux">Sommaire</span>
          <SommaireReglement titres={reglement.articles.map((a) => a.titre)} />
          <div className="mx-3 my-3.5 h-px bg-[var(--bp-trait-8)]" />
          <div className="flex flex-col gap-1.5 px-3">
            <span className="libelle">Une question ?</span>
            <span className="w-fit texte-or text-[22px] font-extrabold chiffres">
              {p.telephone}
            </span>
            <span className="text-[13px] text-texte-attenue">{p.horaires}</span>
          </div>
        </GlassCard>

        <div className="flex min-w-0 flex-[999_1_560px] flex-col lg:max-w-[820px]">
          {reglement.articles.map((article, i) => (
            <section
              key={i}
              id={`art-${i + 1}`}
              aria-labelledby={`titre-art-${i + 1}`}
              className="flex scroll-mt-6 flex-col gap-[22px] border-b border-[var(--bp-trait-8)] py-11 first:pt-0 last:border-b-0"
            >
              <div className="flex items-baseline gap-5">
                <span
                  className="texte-or titre text-[44px] leading-none font-bold"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h2 id={`titre-art-${i + 1}`} className="m-0 titre text-[28px] font-semibold">
                  <span className="sr-only">Article {i + 1} : </span>
                  {article.titre}
                </h2>
              </div>
              <TexteRiche source={article.contenu} ctx={p} />
            </section>
          ))}

          <div className="glass-site mt-10 flex flex-wrap items-center justify-between gap-6 rounded-[24px] px-[30px] py-7">
            <div className="flex flex-col gap-1.5">
              <h2 className="m-0 titre text-[22px] font-semibold">
                Une question sur le règlement ?
              </h2>
              <p className="m-0 text-sm text-texte-doux">
                Un conseiller vous répond : {p.horaires.toLowerCase()}.
              </p>
            </div>
            <BoutonAppeler telephone={p.telephone} />
          </div>
        </div>
      </Wrap>
    </>
  );
}

export default function PageReglement() {
  return (
    <Suspense fallback={<div className="min-h-[800px]" />}>
      <Reglement />
    </Suspense>
  );
}
