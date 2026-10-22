import type { Metadata } from "next";
import { urlPhoto } from "@/services/stockage";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { CarteVehicule } from "@/composants/site/CarteVehicule";
import {
  FONDS,
  FONDS_TYPES,
  FondAmbiance,
  HAUTEUR_EN_TETE,
  noir,
  TitreSection,
  Wrap,
} from "@/composants/site/Mise";
import { TexteEnLigne, TitreAccent } from "@/composants/site/Texte";
import { Button, LienTexte } from "@/composants/ui/Button";
import { Chip } from "@/composants/ui/Chip";
import { Icon, type NomIcone } from "@/composants/ui/Icon";
import { Rule } from "@/composants/ui/Rule";
import { categoriesDuType, selectionException, TYPES, vehiculeVedette } from "@/domaine/flotte";
import type { TypeVehicule } from "@/domaine/types";
import { libelleType } from "@/domaine/unites";
import { lireFlotteVisible, lireParametresSite, type ParametresSite } from "@/services/site";

export const metadata: Metadata = {
  title: {
    absolute: "Black Pégasus – American Transports · Location de bateaux, avions et hélicoptères",
  },
  description:
    "Bateaux, avions et hélicoptères d’exception à San Andreas. Choisissez votre appareil, appelez l’agence en jeu, signez sur place.",
  openGraph: {
    title: "Black Pégasus – American Transports",
    images: ["/images/bg-coucher-de-soleil.jpg"],
  },
};

const ELEMENTS: Record<TypeVehicule, { icone: NomIcone; fond: string; voile: string }> = {
  BATEAU: {
    icone: "bateau",
    fond: FONDS_TYPES.BATEAU,
    voile: `linear-gradient(180deg, ${noir(5)} 0%, ${noir(30)} 45%, ${noir(85)} 100%)`,
  },
  AVION: {
    icone: "avion",
    fond: FONDS_TYPES.AVION,
    voile: `linear-gradient(180deg, ${noir(0)} 0%, ${noir(25)} 45%, ${noir(85)} 100%)`,
  },
  HELICOPTERE: {
    icone: "helicoptere",
    fond: FONDS_TYPES.HELICOPTERE,
    voile: `linear-gradient(180deg, ${noir(0)} 0%, ${noir(20)} 45%, ${noir(85)} 100%)`,
  },
};

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
  const [p, flotte] = await Promise.all([lireParametresSite(), lireFlotteVisible()]);
  const { accroche, etapes, maison } = p.textesSite;
  const vedette = vehiculeVedette(flotte);
  const selection = selectionException(flotte);

  return (
    <>
      {/* ── Hero ── */}
      <section className="relative flex min-h-[788px] flex-col">
        <FondAmbiance
          image={FONDS.coucher}
          position="center 60%"
          decalageHaut={HAUTEUR_EN_TETE}
          voile={`linear-gradient(90deg, ${noir(94)} 0%, ${noir(70)} 38%, ${noir(20)} 72%, ${noir(35)} 100%), linear-gradient(180deg, transparent calc(100% - 260px), var(--bp-black))`}
        />
        <Wrap className="z-10 grid flex-1 grid-cols-[repeat(auto-fit,minmax(min(500px,100%),1fr))] items-center gap-10 pt-10 pb-20">
          <div className="flex max-w-[600px] flex-col gap-7">
            <div className="flex items-center gap-3.5">
              <span className="h-px w-10 bg-or-texte" aria-hidden="true" />
              <span className="libelle text-or-texte">Location de prestige · Los Santos</span>
            </div>
            <h1 className="m-0 titre text-h1 leading-[1.06] font-semibold text-balance">
              <TitreAccent titre={accroche.titre} />
            </h1>
            <p className="m-0 max-w-[500px] text-lg leading-[1.65] text-pretty text-texte-doux">
              <TexteEnLigne texte={accroche.texte} ctx={p} />
            </p>
            <div className="flex flex-wrap gap-3.5">
              <Button href="/flotte" iconeFin="flecheDroite">
                Découvrir la flotte
              </Button>
              <Button href="/reglement" variante="verre">
                Lire le règlement
              </Button>
            </div>
          </div>

          <div className="relative min-w-0 max-lg:flex max-lg:flex-col max-lg:gap-6 lg:h-[560px]">
            <svg
              viewBox="0 0 600 600"
              aria-hidden="true"
              className="absolute -top-5 right-0 size-[560px] max-lg:hidden"
            >
              <defs>
                <linearGradient id="arc-hero" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" style={{ stopColor: "var(--bp-gold-1)", stopOpacity: 0 }} />
                  <stop offset=".3" style={{ stopColor: "var(--bp-gold-3)", stopOpacity: 0.8 }} />
                  <stop offset=".55" style={{ stopColor: "var(--bp-gold-2)" }} />
                  <stop offset="1" style={{ stopColor: "var(--bp-gold-1)", stopOpacity: 0 }} />
                </linearGradient>
              </defs>
              <path
                d="M30 400 A 280 280 0 1 1 570 400"
                fill="none"
                stroke="url(#arc-hero)"
                strokeWidth="1.4"
              />
              <path
                d="M80 380 A 228 228 0 1 1 520 380"
                fill="none"
                stroke="url(#arc-hero)"
                strokeWidth=".8"
                opacity=".45"
              />
            </svg>
            {vedette && (
              <Link
                href={`/flotte/${vedette.slug}`}
                className="glass-site block w-full max-w-[600px] -rotate-2 rounded-[28px] p-2.5 text-texte lg:absolute lg:top-[60px] lg:right-0"
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
            )}
            <BlocTelephone
              p={p}
              className="w-full max-w-[340px] lg:absolute lg:bottom-0 lg:left-0"
            />
          </div>
        </Wrap>
      </section>

      {/* ── Les trois éléments ── */}
      <Wrap as="section" aria-labelledby="titre-flotte" className="pt-10 pb-[120px]">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-5">
          <TitreSection
            id="titre-flotte"
            surtitre="La flotte"
            titre="Trois éléments, une seule exigence"
          />
          <LienTexte href="/flotte">Toute la flotte</LienTexte>
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
          {TYPES.map((type) => {
            const e = ELEMENTS[type];
            const categories = categoriesDuType(flotte, type);
            const modeles = flotte.filter((v) => v.type === type).length;
            return (
              <Link
                key={type}
                href={`/flotte?type=${type}`}
                className="relative block h-[340px] text-texte sm:h-[460px]"
              >
                <span className="absolute inset-0 overflow-hidden rounded-[24px] border border-[var(--bp-trait-8)]">
                  {/* Photo choisie dans Paramètres, sinon le visuel d'ambiance par défaut. */}
                  <FondAmbiance
                    image={p.photosAccueil[type] ? urlPhoto(p.photosAccueil[type]!) : e.fond}
                    voile={e.voile}
                    priorite={false}
                  />
                </span>
                <span className="glass-site absolute inset-x-4 bottom-4 flex flex-col gap-4 px-[22px] pt-[22px] pb-5">
                  {/* Le compteur passe à la ligne au besoin (chevauchement corrigé, CONCEPTION § 9.4). */}
                  <span className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <span className="flex items-center gap-3">
                      <Icon nom={e.icone} taille={26} trait={1.5} className="text-or-icone" />
                      <span className="titre text-[28px] font-semibold">
                        {libelleType(type, true)}
                      </span>
                    </span>
                    <span className="libelle text-texte-doux">
                      {modeles} modèle{modeles > 1 ? "s" : ""}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex flex-wrap gap-1.5">
                      {categories.map((c) => (
                        <Chip key={c.nom}>{c.nom}</Chip>
                      ))}
                    </span>
                    <span className="flex size-11 flex-none items-center justify-center rounded-full text-noir fond-or">
                      <Icon nom="flecheDroite" trait={1.5} />
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </Wrap>

      {/* ── Sélection d'exception ── */}
      <section aria-labelledby="titre-selection" className="relative pt-5 pb-[130px]">
        <div
          aria-hidden="true"
          className="absolute top-0 left-1/2 h-[700px] w-[1100px] max-w-full -translate-x-1/2"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--bp-gold-3) 10%, transparent), transparent)",
          }}
        />
        <Wrap>
          <div className="mb-14">
            <TitreSection
              id="titre-selection"
              centre
              surtitre="Sélection d’exception"
              titre="Les appareils de la maison"
            >
              <p className="m-0 max-w-[520px] text-base leading-[1.6] text-texte-attenue">
                Nos pièces maîtresses, disponibles à l’heure ou à la journée.
              </p>
            </TitreSection>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
            {selection.map((v) => (
              <CarteVehicule
                key={v.slug}
                vehicule={v}
                disponibilite={v.disponibilite}
                format="accueil"
              />
            ))}
          </div>
        </Wrap>
      </section>

      {/* ── Comment louer ── */}
      <section aria-labelledby="titre-etapes" className="relative py-[130px]">
        <FondAmbiance
          image={FONDS.mer}
          priorite={false}
          voile={`linear-gradient(180deg, var(--bp-black) 0%, ${noir(45)} 22%, ${noir(45)} 78%, var(--bp-black) 100%)`}
        />
        <Wrap className="flex flex-col gap-16">
          <TitreSection
            id="titre-etapes"
            centre
            surtitre="Comment louer"
            titre="Trois étapes jusqu’au départ"
          />
          <ol className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-6 p-0">
            {etapes.map((etape, i) => {
              const centrale = i === 1;
              return (
                <li
                  key={i}
                  className={`glass-site flex flex-col gap-[22px] rounded-[24px] px-[30px] py-[34px] ${centrale ? "border-[var(--bp-or-35)]" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="texte-or titre text-[60px] leading-none font-bold">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={`flex size-14 items-center justify-center rounded-full ${centrale ? "text-noir fond-or" : "border border-[var(--bp-or-45)] text-or-icone"}`}
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
                </li>
              );
            })}
          </ol>
          <div className="glass-site flex flex-wrap items-center justify-center gap-x-[26px] gap-y-3.5 self-center rounded-[28px] py-3.5 pr-4 pl-7 sm:rounded-full">
            <span className="libelle text-texte-doux">Aucune réservation en ligne</span>
            <span
              className="h-[22px] w-px bg-[var(--bp-trait-18)] max-sm:hidden"
              aria-hidden="true"
            />
            <span className="text-[15px]">{p.horaires}</span>
            <BoutonAppeler telephone={p.telephone} className="min-h-[46px]" />
          </div>
        </Wrap>
      </section>

      {/* ── La maison ── */}
      <Wrap
        as="section"
        id="maison"
        aria-labelledby="titre-maison"
        className="grid scroll-mt-6 grid-cols-[repeat(auto-fit,minmax(min(460px,100%),1fr))] items-center gap-16 py-[120px]"
      >
        <div className="relative flex h-[min(460px,90vw)] items-center justify-center">
          <svg viewBox="0 0 460 460" aria-hidden="true" className="absolute size-[min(460px,90vw)]">
            <defs>
              <linearGradient id="arc-maison" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" style={{ stopColor: "var(--bp-gold-2)" }} />
                <stop offset=".5" style={{ stopColor: "var(--bp-gold-1)", stopOpacity: 0.2 }} />
                <stop offset="1" style={{ stopColor: "var(--bp-gold-3)" }} />
              </linearGradient>
            </defs>
            <circle
              cx="230"
              cy="230"
              r="226"
              fill="none"
              stroke="url(#arc-maison)"
              strokeWidth="1"
            />
            <circle
              cx="230"
              cy="230"
              r="196"
              fill="none"
              style={{ stroke: "color-mix(in srgb, var(--bp-silver-1) 14%, transparent)" }}
              strokeWidth="1"
            />
          </svg>
          <div
            aria-hidden="true"
            className="absolute size-80 rounded-full"
            style={{
              background:
                "radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--bp-gold-3) 16%, transparent), transparent)",
            }}
          />
          <Image
            src="/images/bp-logo.png"
            alt="Logo Black Pégasus – American Transports"
            width={330}
            height={330}
            className="relative size-[min(330px,65vw)] object-contain"
          />
        </div>
        <div className="flex max-w-[560px] flex-col gap-[26px]">
          <TitreSection id="titre-maison" surtitre="La maison" titre={maison.titre} />
          <p className="m-0 text-[17px] leading-[1.75] text-pretty text-texte-doux">
            <TexteEnLigne texte={maison.texte} ctx={p} />
          </p>
          <Rule className="max-w-[420px]" />
          <ul className="m-0 flex list-none flex-col gap-4 p-0">
            {maison.points.map((point) => (
              <li key={point} className="flex items-center gap-3.5 text-[15px]">
                <Icon nom="valider" trait={1.5} className="text-or-icone" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </Wrap>

      {/* ── Appel ── */}
      <Wrap as="section" aria-labelledby="titre-appel" className="pb-[120px]">
        <div className="relative overflow-hidden rounded-[28px] border border-[var(--bp-trait-8)]">
          <FondAmbiance
            image={FONDS.skyline}
            position="center 70%"
            priorite={false}
            voile={`linear-gradient(90deg, ${noir(85)}, ${noir(35)})`}
          />
          <div className="relative flex flex-wrap items-center justify-between gap-8 p-[clamp(32px,5vw,64px)]">
            <div className="max-w-[520px]">
              <TitreSection
                id="titre-appel"
                surtitre="Réservation"
                titre="Votre prochain départ commence par un appel"
                taille="clamp(26px,2.8vw,38px)"
              />
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
        </div>
      </Wrap>
    </>
  );
}

export default function PageAccueil() {
  return (
    <Suspense fallback={<div className="min-h-[788px]" />}>
      <Accueil />
    </Suspense>
  );
}
