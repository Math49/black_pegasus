import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { urlPhoto } from "@/services/stockage";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { CarteVehicule } from "@/composants/site/CarteVehicule";
import { FONDS, FONDS_TYPES, noir, Wrap } from "@/composants/site/Mise";
import { TexteEnLigne, TitreAccent } from "@/composants/site/Texte";
import {
  Apparition,
  Cascade,
  Inclinable,
  Parallaxe,
  Revelation,
} from "@/composants/site/anime/Anime";
import { LigneEtapes } from "@/composants/site/anime/LigneEtapes";
import {
  Aurores,
  ElementHero,
  EnTeteSection,
  HeroVitrine,
  MedaillonLogo,
  Panneaux,
  Surtitre,
} from "@/composants/site/Vitrine";
import { Button, LienTexte } from "@/composants/ui/Button";
import { Chip } from "@/composants/ui/Chip";
import { Icon, type NomIcone } from "@/composants/ui/Icon";
import { Rule } from "@/composants/ui/Rule";
import { categoriesDuType, selectionException, TYPES, vehiculeVedette } from "@/domaine/flotte";
import { libelleType } from "@/domaine/unites";
import {
  lireFiliale,
  lireFlotteVisible,
  lireParametresSite,
  type ParametresSite,
} from "@/services/site";

export async function generateMetadata(): Promise<Metadata> {
  const filiale = await lireFiliale("BPL");
  return {
    title: { absolute: filiale.nom },
    description:
      "Bateaux, avions et hélicoptères d’exception à San Andreas. Choisissez votre appareil, appelez l’agence en jeu, signez sur place.",
    openGraph: { title: filiale.nom, images: ["/images/bg-coucher-de-soleil.jpg"] },
  };
}

const ICONES_ETAPES: NomIcone[] = ["recherche", "telephone", "contrat"];

function BlocTelephone({ p, className }: { p: ParametresSite; className?: string }) {
  return (
    <div
      className={`glass-site flex flex-col gap-3.5 bg-[var(--bp-surface-55)] px-6 py-[22px] ${className ?? ""}`}
    >
      <span className="libelle">Réservez par téléphone en jeu</span>
      <div className="flex items-center gap-3.5">
        <span className="flex size-[46px] flex-none items-center justify-center rounded-full border border-[var(--bp-or-55)] text-or-icone">
          <Icon nom="telephone" trait={1.5} />
        </span>
        <NumerosTelephone
          telephone={p.telephone}
          className="min-w-0 texte-or text-[clamp(26px,7vw,34px)] leading-tight font-extrabold tracking-[0.02em]"
        />
      </div>
      <div className="h-px bg-[var(--bp-trait-10)]" />
      <div className="flex items-center gap-2.5 text-sm text-texte-doux">
        <Icon nom="horloge" taille={15} />
        {p.horaires}
      </div>
    </div>
  );
}

async function Accueil() {
  const [p, flotte, location] = await Promise.all([
    lireParametresSite(),
    lireFlotteVisible(),
    lireFiliale("BPL"),
  ]);
  const { accroche, etapes, maison } = p.textesSite;
  const vedette = vehiculeVedette(flotte);
  const selection = selectionException(flotte);

  return (
    <>
      {/* ── Hero ── */}
      <HeroVitrine
        fond={FONDS.coucher}
        position="center 60%"
        visuel={
          <div className="relative flex flex-col gap-6 lg:block lg:h-[560px]">
            {vedette && (
              <div className="bp-flotte-lente lg:absolute lg:top-[40px] lg:right-0 lg:w-[min(560px,100%)]">
                <Inclinable className="rounded-[28px]">
                  <Link
                    href={`/location/flotte/${vedette.slug}`}
                    className="glass-site block rounded-[28px] p-2.5 text-texte"
                  >
                    <span className="relative block aspect-video overflow-hidden rounded-[20px]">
                      <Image
                        src={vedette.photoUrl}
                        alt={`${vedette.nom}, ${vedette.categorie.toLowerCase()} de la flotte`}
                        fill
                        priority
                        sizes="600px"
                        className="object-cover"
                      />
                    </span>
                    <span className="glass-site absolute top-6 right-6 flex flex-col gap-[3px] rounded-[14px] bg-[var(--bp-field-bg)] px-4 py-2.5">
                      <span className="libelle text-texte-doux">
                        {libelleType(vedette.type)} · {vedette.categorie}
                      </span>
                      <span className="titre text-lg font-semibold">{vedette.nom}</span>
                    </span>
                  </Link>
                </Inclinable>
              </div>
            )}
            <BlocTelephone
              p={p}
              className="w-full max-w-[340px] lg:absolute lg:bottom-0 lg:left-0"
            />
          </div>
        }
      >
        <ElementHero>
          <Surtitre>Location de prestige · Los Santos</Surtitre>
        </ElementHero>
        <h1 className="m-0 titre text-[clamp(44px,6vw,88px)] leading-[1.02] font-semibold tracking-[-0.025em] text-balance">
          <Revelation delai={0.1}>
            <TitreAccent titre={accroche.titre} />
          </Revelation>
        </h1>
        <ElementHero
          as="p"
          className="m-0 max-w-[500px] text-lg leading-[1.7] text-pretty text-texte-doux"
        >
          <TexteEnLigne texte={accroche.texte} ctx={p} />
        </ElementHero>
        <ElementHero className="flex flex-wrap gap-3.5">
          <Button href="/location/flotte" iconeFin="flecheDroite">
            Découvrir la flotte
          </Button>
          <Button href="/location/reglement" variante="verre">
            Lire le règlement
          </Button>
        </ElementHero>
      </HeroVitrine>

      {/* ── Les trois éléments ── */}
      <Wrap
        as="section"
        aria-labelledby="titre-flotte"
        className="flex flex-col gap-12 pt-10 pb-28"
      >
        <div className="flex flex-wrap items-end justify-between gap-5">
          <EnTeteSection
            id="titre-flotte"
            surtitre="La flotte"
            titre="Trois éléments, une seule exigence"
          />
          <LienTexte href="/location/flotte">Toute la flotte</LienTexte>
        </div>
        <Panneaux
          hauteur="h-[min(560px,72vh)]"
          panneaux={TYPES.map((type) => {
            const modeles = flotte.filter((v) => v.type === type).length;
            return {
              cle: type,
              href: `/location/flotte?type=${type}`,
              titre: libelleType(type, true),
              surtitre: `${modeles} modèle${modeles > 1 ? "s" : ""}`,
              // Photo choisie dans Paramètres, sinon le visuel d'ambiance par défaut.
              fond: p.photosAccueil[type] ? urlPhoto(p.photosAccueil[type]!) : FONDS_TYPES[type],
              pied: (
                <span className="flex flex-wrap gap-1.5">
                  {categoriesDuType(flotte, type).map((c) => (
                    <Chip key={c.nom}>{c.nom}</Chip>
                  ))}
                </span>
              ),
              action: "Voir les modèles",
            };
          })}
        />
      </Wrap>

      {/* ── Sélection d'exception ── */}
      <section aria-labelledby="titre-selection" className="relative pt-5 pb-28">
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 h-[700px] w-[1100px] max-w-full -translate-x-1/2"
          style={{
            background: "radial-gradient(50% 50% at 50% 50%, var(--bp-or-10), transparent)",
          }}
        />
        <Wrap className="flex flex-col gap-14">
          <EnTeteSection
            id="titre-selection"
            centre
            surtitre="Sélection d’exception"
            titre="Les appareils de la maison"
          >
            <p className="m-0 max-w-[520px] text-base leading-[1.6] text-texte-attenue">
              Nos pièces maîtresses, disponibles à l’heure ou à la journée.
            </p>
          </EnTeteSection>
          <Cascade className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
            {selection.map((v) => (
              <ElementHero key={v.slug}>
                <Inclinable intensite={5} className="h-full rounded-[24px]">
                  <CarteVehicule vehicule={v} disponibilite={v.disponibilite} format="accueil" />
                </Inclinable>
              </ElementHero>
            ))}
          </Cascade>
        </Wrap>
      </section>

      {/* ── Comment louer ── */}
      <section aria-labelledby="titre-etapes" className="relative isolate overflow-hidden py-32">
        <Parallaxe amplitude={200} className="-z-10">
          <Image src={FONDS.mer} alt="" fill sizes="100vw" className="object-cover" />
        </Parallaxe>
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            background: `linear-gradient(180deg, var(--bp-black) 0%, ${noir(55)} 22%, ${noir(55)} 78%, var(--bp-black) 100%)`,
          }}
        />
        <Wrap className="flex flex-col gap-16">
          <EnTeteSection
            id="titre-etapes"
            centre
            surtitre="Comment louer"
            titre="Trois étapes jusqu’au départ"
          />
          <div className="relative">
            <LigneEtapes />
            <Cascade
              as="ol"
              className="relative m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6 p-0"
            >
              {etapes.map((etape, i) => (
                <ElementHero
                  key={i}
                  as="li"
                  className="glass-site group flex flex-col gap-[22px] rounded-[24px] px-[30px] py-[34px] transition-colors duration-500 hover:border-[var(--bp-or-35)]"
                >
                  <div className="flex items-center justify-between">
                    <span className="texte-or titre text-[64px] leading-none font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className="flex size-14 items-center justify-center rounded-full border border-[var(--bp-or-45)] text-or-icone transition-all duration-500 group-hover:border-transparent group-hover:text-noir group-hover:fond-or"
                      aria-hidden="true"
                    >
                      <Icon nom={ICONES_ETAPES[i] ?? "valider"} taille={24} trait={1.5} />
                    </span>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <h3 className="m-0 titre text-[22px] font-semibold">{etape.titre}</h3>
                    <p className="m-0 text-[15px] leading-[1.65] text-texte-doux">
                      <TexteEnLigne texte={etape.texte} ctx={p} />
                    </p>
                  </div>
                </ElementHero>
              ))}
            </Cascade>
          </div>
          <Apparition className="glass-site flex flex-wrap items-center justify-center gap-x-[26px] gap-y-3.5 self-center rounded-[28px] py-3.5 pr-4 pl-7 sm:rounded-full">
            <span className="libelle text-texte-doux">Aucune réservation en ligne</span>
            <span
              className="h-[22px] w-px bg-[var(--bp-trait-18)] max-sm:hidden"
              aria-hidden="true"
            />
            <span className="text-[15px]">{p.horaires}</span>
            <BoutonAppeler telephone={p.telephone} className="min-h-[46px]" />
          </Apparition>
        </Wrap>
      </section>

      {/* ── La maison ── */}
      <Wrap
        as="section"
        id="maison"
        aria-labelledby="titre-maison"
        className="grid scroll-mt-28 grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-center gap-16 py-28"
      >
        <Apparition>
          <MedaillonLogo
            id="anneau-location"
            logo={location.logo}
            alt={`Logo ${location.nom}`}
            anneau={`${location.nom} · Bateaux · Avions · Hélicoptères`}
            className="mx-auto max-w-[440px]"
          />
        </Apparition>
        <Apparition delai={0.1} className="flex max-w-[560px] flex-col gap-[26px]">
          <Surtitre>La maison</Surtitre>
          <h2
            id="titre-maison"
            className="m-0 titre text-[clamp(32px,3.6vw,52px)] leading-[1.08] font-semibold"
          >
            {maison.titre}
          </h2>
          <p className="m-0 text-[17px] leading-[1.75] text-pretty text-texte-doux">
            <TexteEnLigne texte={maison.texte} ctx={p} />
          </p>
          <Rule className="max-w-[420px]" />
          <Cascade as="ul" className="m-0 flex list-none flex-col gap-4 p-0">
            {maison.points.map((point) => (
              <ElementHero key={point} as="li" className="flex items-center gap-3.5 text-[15px]">
                <Icon nom="valider" trait={1.5} className="text-or-icone" />
                {point}
              </ElementHero>
            ))}
          </Cascade>
        </Apparition>
      </Wrap>

      {/* ── Appel ── */}
      <Wrap as="section" aria-labelledby="titre-appel" className="pb-28">
        <Apparition className="relative isolate overflow-hidden rounded-[32px] border border-[var(--bp-trait-8)]">
          <Parallaxe amplitude={140} className="-z-10">
            <Image
              src={FONDS.skyline}
              alt=""
              fill
              sizes="(max-width: 1280px) 100vw, 1280px"
              className="object-cover"
              style={{ objectPosition: "center 70%" }}
            />
          </Parallaxe>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10"
            style={{ background: `linear-gradient(90deg, ${noir(88)}, ${noir(35)})` }}
          />
          <Aurores className="-z-10" />
          <div className="flex flex-wrap items-center justify-between gap-8 p-[clamp(32px,6vw,80px)]">
            <div className="flex max-w-[560px] flex-col gap-5">
              <Surtitre>Réservation</Surtitre>
              <h2
                id="titre-appel"
                className="m-0 titre text-[clamp(30px,3.4vw,50px)] leading-[1.06] font-semibold"
              >
                Votre prochain départ commence par un appel
              </h2>
            </div>
            <div className="glass-site flex min-w-[min(300px,100%)] flex-col gap-4 px-7 py-[26px]">
              <span className="libelle">Téléphone en jeu</span>
              <NumerosTelephone
                telephone={p.telephone}
                className="texte-or text-[clamp(30px,8vw,42px)] leading-[1.1] font-extrabold"
              />
              <span className="flex items-center gap-2.5 text-sm text-texte-doux">
                <Icon nom="horloge" taille={15} />
                {p.horaires}
              </span>
            </div>
          </div>
        </Apparition>
      </Wrap>
    </>
  );
}

export default function PageAccueil() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <Accueil />
    </Suspense>
  );
}
