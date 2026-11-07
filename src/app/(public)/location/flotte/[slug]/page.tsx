import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { CarteVehicule } from "@/composants/site/CarteVehicule";
import { HeroFiche } from "@/composants/site/HeroFiche";
import { FilAriane, HAUTEUR_EN_TETE, TitreSection, Wrap } from "@/composants/site/Mise";
import { Blocs, TexteEnLigne } from "@/composants/site/Texte";
import { Badge } from "@/composants/ui/Badge";
import { Button, LienTexte } from "@/composants/ui/Button";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon, type NomIcone } from "@/composants/ui/Icon";
import { Rule } from "@/composants/ui/Rule";
import { formaterDollars } from "@/domaine/argent";
import { vehiculesSimilaires } from "@/domaine/flotte";
import { texteBrut } from "@/domaine/textes";
import { formaterContenance, libelleType } from "@/domaine/unites";
import { lireBlocs } from "@/lib/texteRiche";
import { lireFlotteVisible, lireParametresSite } from "@/services/site";

async function trouver(slug: string) {
  const flotte = await lireFlotteVisible();
  return { flotte, vehicule: flotte.find((v) => v.slug === slug) ?? null };
}

export async function generateMetadata({
  params,
}: PageProps<"/location/flotte/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [{ vehicule: v }, p] = await Promise.all([trouver(slug), lireParametresSite()]);
  if (!v) return { title: "Véhicule introuvable" };
  const accroche = lireBlocs(v.description).find((b) => b.type === "paragraphe");
  const description =
    accroche?.type === "paragraphe"
      ? texteBrut(accroche.texte, p)
      : `${libelleType(v.type)} · ${v.categorie} à louer dès ${formaterDollars(v.prixHeure)} de l’heure. Réservation par téléphone en jeu.`;
  return {
    title: `${v.nom} · ${libelleType(v.type)} ${v.categorie.toLowerCase()}`,
    description,
    openGraph: { title: `${v.nom} · Black Pégasus`, description, images: [v.photoUrl] },
  };
}

function BlocCaracteristique({
  icone,
  valeur,
  libelle,
  vedette = false,
}: {
  icone: NomIcone;
  valeur: React.ReactNode;
  libelle: string;
  vedette?: boolean;
}) {
  return (
    <GlassCard
      variante="site"
      className={`flex aspect-square flex-col justify-between rounded-[22px] p-[22px] max-sm:aspect-auto max-sm:gap-6 ${vedette ? "border-[var(--bp-or-40)]" : ""}`}
    >
      <span
        aria-hidden="true"
        className={`flex size-12 items-center justify-center rounded-[14px] ${vedette ? "text-noir fond-or" : "border border-[var(--bp-or-40)] text-or-icone"}`}
      >
        <Icon nom={icone} taille={24} trait={1.5} />
      </span>
      <span className="flex flex-col gap-1.5">
        {valeur}
        <span className="libelle">{libelle}</span>
      </span>
    </GlassCard>
  );
}

const A_SAVOIR: { icone: NomIcone; texte: string }[] = [
  {
    icone: "bouclier",
    texte: "Caution versée à la signature, restituée au retour si l’appareil est intact.",
  },
  { icone: "horloge", texte: "Tout retard au retour est facturé par heure entamée." },
  {
    icone: "document",
    texte: "Conditions complètes dans le [règlement des locations](/location/reglement).",
  },
];

async function Fiche({ params }: { params: PageProps<"/location/flotte/[slug]">["params"] }) {
  const { slug } = await params;
  const [{ flotte, vehicule: v }, p] = await Promise.all([trouver(slug), lireParametresSite()]);
  if (!v) notFound();

  const blocs = lireBlocs(v.description);
  const iAccroche = blocs.findIndex((b) => b.type === "paragraphe");
  const accroche = iAccroche >= 0 ? blocs[iAccroche] : null;
  const suite = blocs.filter((_, i) => i !== iAccroche);
  const titrePresentation = suite.find((b) => b.type === "titre");
  const corps = suite.filter((b) => b !== titrePresentation);
  const [nombre, unite] = formaterContenance(v.contenanceKg).split(" ");
  const libre = v.disponibilite.libres > 0;
  const similaires = vehiculesSimilaires(v, flotte);

  return (
    <>
      <HeroFiche photos={[v.photoUrl, ...v.galerieUrls]} nom={v.nom} decalageHaut={HAUTEUR_EN_TETE}>
        <div className="flex max-w-[540px] flex-col gap-6">
          <FilAriane
            etapes={[
              { libelle: "Accueil", href: "/" },
              { libelle: libelleType(v.type, true), href: `/location/flotte?type=${v.type}` },
              { libelle: v.nom },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <span className="libelle text-or-texte">
              {libelleType(v.type)} · {v.categorie}
            </span>
            <Badge disponibilite={v.disponibilite} />
          </div>
          <h1 className="m-0 texte-or titre text-[clamp(56px,7vw,104px)] leading-none font-bold tracking-[-0.02em]">
            {v.nom}
          </h1>
          {accroche?.type === "paragraphe" && (
            <p className="m-0 text-[17px] leading-[1.7] text-pretty text-texte-doux">
              <TexteEnLigne texte={accroche.texte} ctx={p} />
            </p>
          )}
          <div className="flex items-baseline gap-2.5">
            <span className="text-sm text-texte-attenue">à partir de</span>
            <span className="texte-or text-[40px] font-extrabold chiffres">
              {formaterDollars(v.prixHeure)}
            </span>
            <span className="text-sm text-texte-attenue">/ heure</span>
          </div>
          <div className="flex flex-wrap gap-3.5">
            <BoutonAppeler telephone={p.telephone} className="min-h-[58px] px-[30px] text-base" />
            <Button
              href={`/location/flotte?type=${v.type}`}
              variante="verre"
              icone="flecheGauche"
              className="min-h-[58px]"
            >
              Retour à la flotte
            </Button>
          </div>
        </div>
      </HeroFiche>

      <Wrap as="section" aria-label="Caractéristiques" className="z-20 -mt-[120px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-[18px]">
          <BlocCaracteristique
            icone="personnes"
            libelle="Places"
            valeur={
              <span className="text-[44px] leading-none font-extrabold chiffres">{v.places}</span>
            }
          />
          <BlocCaracteristique
            icone="colis"
            libelle="Contenance"
            valeur={
              <span className="text-[44px] leading-none font-extrabold chiffres">
                {nombre}
                <span className="ml-1.5 text-xl text-texte-doux">{unite}</span>
              </span>
            }
          />
          <BlocCaracteristique
            icone="etiquette"
            libelle="Catégorie"
            valeur={
              <span className="titre text-[28px] leading-[1.1] font-semibold">{v.categorie}</span>
            }
          />
          <BlocCaracteristique
            vedette
            icone="couches"
            libelle={`Exemplaire${v.disponibilite.libres > 1 ? "s" : ""} disponible${v.disponibilite.libres > 1 ? "s" : ""}`}
            valeur={
              <span className="text-[44px] leading-none font-extrabold chiffres">
                <span className={libre ? "texte-or" : "text-texte-attenue"}>
                  {v.disponibilite.libres}
                </span>
                <span className="text-2xl text-texte-attenue"> / {v.disponibilite.total}</span>
              </span>
            }
          />
        </div>
      </Wrap>

      <Wrap
        as="section"
        aria-label="Présentation et tarifs"
        className="flex flex-wrap items-start gap-10 pt-[90px] pb-[110px]"
      >
        <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-7">
          {(titrePresentation || corps.length > 0) && (
            <>
              <TitreSection
                surtitre="Présentation"
                titre={titrePresentation?.type === "titre" ? titrePresentation.texte : v.nom}
                taille="clamp(26px,2.8vw,38px)"
              />
              <div className="flex max-w-[640px] flex-col gap-4">
                <Blocs blocs={corps} ctx={p} />
              </div>
              <Rule className="max-w-[520px]" />
            </>
          )}
          <div className="flex max-w-[640px] flex-col gap-1.5">
            <h2 className="m-0 mb-2 libelle text-texte-doux">À savoir avant de louer</h2>
            <ul className="m-0 list-none p-0">
              {A_SAVOIR.map((a) => (
                <li
                  key={a.icone}
                  className="flex items-start gap-3.5 py-3 text-[15px] leading-[1.6]"
                >
                  <Icon nom={a.icone} trait={1.5} className="mt-0.5 text-or-icone" />
                  <span>
                    <TexteEnLigne texte={a.texte} ctx={p} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <GlassCard
          as="aside"
          id="tarifs"
          aria-labelledby="titre-tarifs"
          variante="site"
          className="flex w-full flex-[1_1_360px] flex-col gap-1.5 rounded-[24px] px-7 py-[30px] lg:max-w-[420px]"
        >
          <div className="mb-2.5 flex items-center justify-between">
            <h2 id="titre-tarifs" className="m-0 titre text-[26px] font-semibold">
              Tarifs
            </h2>
            <Badge
              disponibilite={{ ...v.disponibilite, libelle: libre ? "Disponible" : "Complet" }}
            />
          </div>
          {[
            {
              libelle: "À l’heure",
              valeur: formaterDollars(v.prixHeure),
              classe: "texte-or text-[32px] font-extrabold",
            },
            {
              libelle: "À la journée",
              valeur: formaterDollars(v.prixJour),
              classe: "texte-argent text-[26px] font-extrabold",
            },
            { libelle: "Caution", valeur: formaterDollars(v.caution), classe: "text-xl font-bold" },
          ].map((ligne) => (
            <div
              key={ligne.libelle}
              className="flex items-baseline justify-between gap-4 border-b border-[var(--bp-trait-8)] py-4"
            >
              <span className="text-[15px] text-texte-doux">{ligne.libelle}</span>
              <span className={`chiffres ${ligne.classe}`}>{ligne.valeur}</span>
            </div>
          ))}
          <div className="mt-3.5 flex items-start gap-3 rounded-[14px] border border-[var(--bp-or-25)] bg-[var(--bp-or-8)] px-4 py-3.5">
            <Icon nom="information" trait={1.5} className="mt-px text-or-icone" />
            <span className="text-[13.5px] leading-[1.55]">
              Le tarif journalier s’applique automatiquement s’il est plus avantageux.
            </span>
          </div>
          <BoutonAppeler
            telephone={p.telephone}
            className="mt-5 min-h-[62px] rounded-[18px] text-[17px]"
          />
          <div className="mt-3 flex flex-col items-center gap-1 text-center">
            <span className="text-[13.5px] text-texte-doux">{p.horaires}</span>
            <span className="text-[12.5px] text-texte-attenue">
              Aucune réservation en ligne · contrat signé à l’agence
            </span>
          </div>
        </GlassCard>
      </Wrap>

      {similaires.length > 0 && (
        <Wrap as="section" aria-labelledby="titre-similaires" className="pb-[120px]">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <TitreSection
              id="titre-similaires"
              surtitre="Pour prendre l’air"
              titre="Véhicules similaires"
              taille="clamp(26px,2.8vw,38px)"
            />
            <LienTexte href="/location/flotte">Toute la flotte</LienTexte>
          </div>
          <ul
            // Animation CSS : chaque nouvelle liste (filtre, autre fiche) rejoue son apparition.
            className="bp-entree m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(320px,100%),1fr))] gap-6 p-0"
          >
            {similaires.map((s) => (
              <li key={s.slug} className="flex">
                <CarteVehicule
                  vehicule={s}
                  disponibilite={s.disponibilite}
                  format="similaire"
                  className="w-full"
                />
              </li>
            ))}
          </ul>
        </Wrap>
      )}
    </>
  );
}

export default function PageFiche({ params }: PageProps<"/location/flotte/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-[880px]" />}>
      <Fiche params={params} />
    </Suspense>
  );
}
