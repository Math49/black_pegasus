import type { Metadata } from "next";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import { Suspense } from "react";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { CarteVehicule } from "@/composants/site/CarteVehicule";
import { FiltresFlotte, TriFlotte } from "@/composants/site/FiltresFlotte";
import {
  FilAriane,
  FONDS,
  FondAmbiance,
  HAUTEUR_EN_TETE,
  noir,
  Wrap,
} from "@/composants/site/Mise";
import { Icon, type NomIcone } from "@/composants/ui/Icon";
import { Seg } from "@/composants/ui/Seg";
import {
  categoriesDuType,
  ecrireFiltres,
  filtrerFlotte,
  histogrammePrix,
  lireFiltres,
  TYPES,
} from "@/domaine/flotte";
import type { TypeVehicule } from "@/domaine/types";
import { libelleType } from "@/domaine/unites";
import { lireFlotteVisible, lireParametresSite } from "@/services/site";

export const metadata: Metadata = {
  title: "La flotte",
  description:
    "Bateaux, avions et hélicoptères à louer à l’heure ou à la journée, avec leur disponibilité mise à jour par l’agence.",
  openGraph: { title: "La flotte · Black Pégasus", images: ["/images/bg-mer.jpg"] },
};

const ICONES: Record<TypeVehicule, NomIcone> = {
  BATEAU: "bateau",
  AVION: "avion",
  HELICOPTERE: "helicoptere",
};
const FOND: Record<TypeVehicule, { image: string; position: string }> = {
  BATEAU: { image: FONDS.mer, position: "center" },
  AVION: { image: FONDS.piste, position: "center 40%" },
  HELICOPTERE: { image: FONDS.skyline, position: "center 70%" },
};

async function Flotte({
  searchParams,
}: {
  searchParams: PageProps<"/location/flotte">["searchParams"];
}) {
  const [params, p, flotte] = await Promise.all([
    searchParams,
    lireParametresSite(),
    lireFlotteVisible(),
  ]);
  const filtres = lireFiltres(params);
  const resultats = filtrerFlotte(flotte, filtres);
  const categories = categoriesDuType(flotte, filtres.type);
  // Silhouette des prix de toute la flotte visible (maquette 02 : $150 – $4 500).
  const histogramme = histogrammePrix(
    flotte.map((v) => v.prixHeure),
    15,
    1.2,
  );
  const nombreActifs = [
    filtres.categories !== null,
    filtres.places,
    filtres.contenance,
    filtres.prixMax !== null,
    filtres.dispo,
  ].filter(Boolean).length;
  const fond = FOND[filtres.type];

  return (
    <>
      <FondAmbiance
        image={fond.image}
        position={fond.position}
        hauteur={760}
        decalageHaut={HAUTEUR_EN_TETE}
        voile={`linear-gradient(180deg, ${noir(55)} 0%, ${noir(55)} 40%, var(--bp-black) 100%)`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-[1100px] -left-[200px] size-[900px]"
        style={{
          background:
            "radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--bp-gold-3) 8%, transparent), transparent)",
        }}
      />

      <Wrap large className="z-10 flex flex-wrap items-end justify-between gap-7 pt-[72px] pb-10">
        <div className="flex max-w-[640px] flex-col gap-4">
          <FilAriane etapes={[{ libelle: "Accueil", href: "/" }, { libelle: "La flotte" }]} />
          <h1 className="m-0 titre text-[clamp(40px,4.4vw,62px)] leading-[1.05] font-semibold">
            Choisissez votre <span className="texte-or font-semibold">appareil</span>
          </h1>
          <p className="m-0 text-[17px] leading-[1.6] text-texte-doux">
            Tarifs à l’heure ou à la journée, disponibilités mises à jour par l’agence.
          </p>
        </div>
        <div className="glass-site flex items-center gap-4 px-[22px] py-4">
          <span className="flex size-11 flex-none items-center justify-center rounded-full border border-[var(--bp-or-55)] text-or-icone">
            <Icon nom="telephone" trait={1.5} />
          </span>
          <span className="flex flex-col gap-1">
            <span className="libelle">Réservez par téléphone en jeu</span>
            <span className="flex flex-wrap items-baseline gap-x-3">
              <NumerosTelephone
                telephone={p.telephone}
                className="texte-or text-2xl font-extrabold"
              />
              <span className="text-[13px] text-texte-doux">{p.horaires}</span>
            </span>
          </span>
        </div>
      </Wrap>

      <Wrap large className="z-10 pb-10">
        <Seg
          variante="site"
          libelle="Type de véhicule"
          valeur={filtres.type}
          options={TYPES.map((type) => ({
            valeur: type,
            libelle: (
              <>
                <Icon nom={ICONES[type]} trait={1.5} />
                {libelleType(type, true)}
              </>
            ),
            compteur: flotte.filter((v) => v.type === type).length,
            href: `/location/flotte?${ecrireFiltres({ ...lireFiltres({}), type, dispo: filtres.dispo, tri: filtres.tri })}`,
          }))}
        />
      </Wrap>

      <Wrap large className="z-10 flex flex-col items-start gap-8 pb-[100px] lg:flex-row">
        <FiltresFlotte
          key={ecrireFiltres(filtres)}
          filtres={filtres}
          categories={categories}
          histogramme={histogramme}
          nombreActifs={nombreActifs}
        />

        <div className="flex w-full min-w-0 flex-col gap-7 lg:flex-[999_1_560px]">
          <div className="flex flex-wrap items-center justify-between gap-3.5">
            <p className="m-0 text-[15px] text-texte-doux" aria-live="polite">
              <strong className="text-lg text-texte">{resultats.length}</strong> modèle
              {resultats.length > 1 ? "s" : ""} · {libelleType(filtres.type, true)}
            </p>
            <TriFlotte filtres={filtres} />
          </div>

          {resultats.length > 0 ? (
            <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(262px,100%),1fr))] gap-x-[22px] gap-y-6 p-0">
              {resultats.map((v) => (
                <li key={v.slug} className="flex">
                  <CarteVehicule
                    vehicule={v}
                    disponibilite={v.disponibilite}
                    format="flotte"
                    titre="h2"
                    className="w-full"
                  />
                </li>
              ))}
            </ul>
          ) : (
            <div className="glass-site flex flex-col items-center gap-3 p-10 text-center">
              <h2 className="m-0 titre text-2xl font-semibold">Aucun appareil ne correspond</h2>
              <p className="m-0 text-[15px] text-texte-attenue">
                Élargissez vos filtres, ou appelez l’agence : un exemplaire peut se libérer.
              </p>
            </div>
          )}

          <div className="glass-site mt-4 flex flex-wrap items-center justify-between gap-x-7 gap-y-[18px] px-[26px] py-[22px]">
            <div className="flex max-w-[560px] items-center gap-3.5">
              <Icon nom="information" trait={1.5} className="text-or-icone" />
              <span className="text-sm leading-[1.55] text-texte-doux">
                Le tarif journalier s’applique automatiquement s’il est plus avantageux. Aucune
                réservation en ligne.
              </span>
            </div>
            <BoutonAppeler telephone={p.telephone} />
          </div>
        </div>
      </Wrap>
    </>
  );
}

export default function PageFlotte({ searchParams }: PageProps<"/location/flotte">) {
  return (
    <Suspense fallback={<div className="min-h-[800px]" />}>
      <Flotte searchParams={searchParams} />
    </Suspense>
  );
}
