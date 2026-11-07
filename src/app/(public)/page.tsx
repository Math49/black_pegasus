import Image from "next/image";
import { Suspense } from "react";
import { lireFilialesVisibles, lireFlotteVisible, lireParametresSite } from "@/services/site";
import { lirePermisPublics } from "@/services/formation";
import { libelleFiliale } from "@/domaine/filiales";
import { texteBrut } from "@/domaine/textes";
import type { CodeFiliale } from "@/domaine/types";
import { Button } from "@/composants/ui/Button";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import { TexteEnLigne, TitreAccent } from "@/composants/site/Texte";
import { FONDS, Wrap } from "@/composants/site/Mise";
import {
  Apparition,
  Cascade,
  Compteur,
  ElementCascade,
  Revelation,
  TexteEclaire,
} from "@/composants/site/anime/Anime";
import {
  Defilant,
  EnTeteSection,
  HeroVitrine,
  MedaillonLogo,
  Panneaux,
  Surtitre,
} from "@/composants/site/Vitrine";

export async function generateMetadata() {
  const p = await lireParametresSite();
  return {
    title: { absolute: p.nomEntreprise },
    description: texteBrut(p.textesGroupe.accroche.texte, p),
    openGraph: { title: p.nomEntreprise, images: ["/images/logos/bp-compagnie.webp"] },
  };
}

/** Visuel de chaque filiale sur l'accueil du groupe (Cards : dégradé de son accent). */
const FONDS_FILIALES: Partial<Record<CodeFiliale, string>> = {
  BPL: FONDS.coucher,
  BPF: FONDS.piste,
};

async function AccueilGroupe() {
  const [p, filiales] = await Promise.all([lireParametresSite(), lireFilialesVisibles()]);
  const visible = (code: CodeFiliale) => filiales.some((f) => f.code === code);
  const [flotte, permis] = await Promise.all([
    visible("BPL") ? lireFlotteVisible() : Promise.resolve([]),
    visible("BPF") ? lirePermisPublics() : Promise.resolve([]),
  ]);
  const { accroche, presentation } = p.textesGroupe;
  const chiffres = [
    { valeur: filiales.length, libelle: filiales.length > 1 ? "filiales" : "filiale" },
    { valeur: flotte.length, libelle: "appareils à louer" },
    {
      valeur: permis.length,
      libelle: permis.length > 1 ? "licences préparées" : "licence préparée",
    },
  ].filter((c) => c.valeur > 0);

  return (
    <>
      <HeroVitrine
        fond={FONDS.skyline}
        visuel={
          <MedaillonLogo
            id="anneau-groupe"
            logo="/images/logos/bp-compagnie.webp"
            alt={`Logo ${p.nomEntreprise}`}
            anneau={[p.nomEntreprise, ...filiales.map((f) => libelleFiliale(f.code))].join(" · ")}
            priorite
            className="mx-auto max-w-[460px] max-lg:max-w-[240px]"
          />
        }
      >
        <ElementCascade>
          <Surtitre>{p.nomEntreprise}</Surtitre>
        </ElementCascade>
        <h1 className="m-0 titre text-[clamp(44px,6.6vw,96px)] leading-[1] font-semibold tracking-[-0.025em] text-balance">
          <Revelation>
            <TitreAccent titre={accroche.titre} />
          </Revelation>
        </h1>
        <ElementCascade
          as="p"
          className="m-0 max-w-[560px] text-lg leading-[1.75] text-pretty text-texte-doux"
        >
          <TexteEnLigne texte={accroche.texte} ctx={p} />
        </ElementCascade>
        <ElementCascade className="flex flex-wrap gap-3.5">
          {filiales.length > 0 && (
            <Button href="#filiales" iconeFin="flecheDroite">
              Découvrir nos filiales
            </Button>
          )}
          <Button href="#contacts" variante="verre" icone="telephone">
            Nous contacter
          </Button>
        </ElementCascade>
      </HeroVitrine>

      {filiales.length > 0 && (
        <section aria-label="Nos activités" className="border-y border-[var(--bp-trait-8)]">
          <Defilant mots={filiales.map((f) => f.nom)} />
        </section>
      )}

      {chiffres.length > 0 && (
        <Wrap as="section" aria-label="Le groupe en chiffres" className="py-20">
          <Cascade className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-px overflow-hidden rounded-[28px] border border-[var(--bp-trait-8)] bg-[var(--bp-trait-8)]">
            {chiffres.map((c) => (
              <ElementCascade key={c.libelle} className="flex flex-col gap-3 bg-noir px-8 py-10">
                <Compteur
                  valeur={c.valeur}
                  className="texte-or titre text-[clamp(48px,5vw,72px)] leading-none font-bold"
                />
                <span className="libelle">{c.libelle}</span>
              </ElementCascade>
            ))}
          </Cascade>
        </Wrap>
      )}

      {filiales.length > 0 && (
        <Wrap
          as="section"
          id="filiales"
          aria-labelledby="titre-filiales"
          className="flex scroll-mt-28 flex-col gap-12 pb-28"
        >
          <EnTeteSection id="titre-filiales" surtitre="Le groupe" titre="Nos filiales">
            <p className="m-0 max-w-[560px] text-lg leading-relaxed text-texte-doux">
              Chaque filiale porte sa spécialité et sa couleur, avec la même exigence de service.
            </p>
          </EnTeteSection>
          <Panneaux
            panneaux={filiales.map((f) => ({
              cle: f.code,
              href: `/${f.slug}`,
              titre: f.nom,
              surtitre: libelleFiliale(f.code),
              texte: f.accroche,
              fond: FONDS_FILIALES[f.code],
              logo: f.logo,
              filiale: f.slug,
              action: "Découvrir",
            }))}
          />
        </Wrap>
      )}

      <section aria-labelledby="titre-groupe" className="relative overflow-hidden py-28">
        <div
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 h-[700px] w-[1100px] max-w-full -translate-x-1/2 -translate-y-1/2"
          style={{
            background: "radial-gradient(50% 50% at 50% 50%, var(--bp-or-10), transparent)",
          }}
        />
        <Wrap className="flex flex-col gap-10">
          <Apparition className="flex flex-col gap-5">
            <Surtitre>Notre engagement</Surtitre>
            <h2
              id="titre-groupe"
              className="m-0 titre text-[clamp(30px,3.4vw,48px)] leading-[1.1] font-semibold"
            >
              <TitreAccent titre={presentation.titre} />
            </h2>
          </Apparition>
          <TexteEclaire
            texte={texteBrut(presentation.texte, p)}
            className="m-0 max-w-[1080px] titre text-[clamp(24px,3vw,42px)] leading-[1.35] font-medium text-texte"
          />
        </Wrap>
      </section>

      {filiales.length > 0 && (
        <Wrap
          as="section"
          id="contacts"
          aria-labelledby="titre-contacts"
          className="flex scroll-mt-28 flex-col gap-12 pb-28"
        >
          <EnTeteSection id="titre-contacts" surtitre="Contacts" titre="Nous contacter en jeu" />
          <Cascade as="ul" className="m-0 flex list-none flex-col p-0">
            {filiales.map((f) => (
              <ElementCascade
                key={f.code}
                as="li"
                filiale={f.slug}
                className="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-8 gap-y-5 border-t border-[var(--bp-trait-10)] py-8 transition-colors duration-500 last:border-b hover:bg-[var(--bp-or-8)] max-lg:grid-cols-[auto_minmax(0,1fr)] max-lg:px-0 lg:px-6"
              >
                <Image
                  src={f.logo}
                  alt=""
                  width={72}
                  height={72}
                  className="size-16 rounded-full bg-noir object-contain ring-1 ring-[var(--bp-or-35)] transition-transform duration-500 group-hover:scale-110"
                />
                <div className="flex min-w-0 flex-col gap-2">
                  <h3 className="m-0 titre text-xl font-semibold">{f.nom}</h3>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                    <NumerosTelephone
                      telephone={f.telephone}
                      className="texte-or text-[clamp(22px,2.4vw,30px)] font-bold"
                    />
                    <span className="text-sm text-texte-doux">{f.horaires}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 max-lg:col-span-2">
                  <BoutonAppeler telephone={f.telephone} />
                </div>
              </ElementCascade>
            ))}
          </Cascade>
        </Wrap>
      )}
    </>
  );
}

export default function PageGroupe() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <AccueilGroupe />
    </Suspense>
  );
}
