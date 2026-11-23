import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FormulaireEnchere } from "@/composants/site/FormulaireEnchere";
import { ImageProtegee } from "@/composants/site/ImageProtegee";
import { Wrap } from "@/composants/site/Mise";
import { Actualisation, CompteARebours } from "@/composants/ui/CompteARebours";
import { Icon } from "@/composants/ui/Icon";
import { formaterDollars } from "@/domaine/argent";
import { formaterHeure, formaterJourCourt } from "@/domaine/dates";
import { etatEnchere, meilleureOffre, montantMinimum } from "@/domaine/encheres";
import { maintenant } from "@/lib/horloge";
import { lireEncherePublique } from "@/services/encheres";
import { lireFiliale, lireParametresSite } from "@/services/site";

const OFFRES_AFFICHEES = 10;

export async function generateMetadata({ params }: PageProps<"/cards/encheres/[id]">) {
  const e = await lireEncherePublique((await params).id);
  return { title: e ? `Enchère · ${e.carte.nom}` : "Enchère" };
}

async function Enchere({ params }: { params: PageProps<"/cards/encheres/[id]">["params"] }) {
  const f = await lireFiliale("BPC");
  if (!f.visible) notFound();
  const { id } = await params;
  const [e, instant, p] = await Promise.all([
    lireEncherePublique(id),
    maintenant(),
    lireParametresSite(),
  ]);
  if (!e) notFound();
  const etat = etatEnchere(e, e.offres, instant);
  const meilleure = meilleureOffre(e.offres);
  const quand = (d: Date) =>
    `${formaterJourCourt(d, p.fuseauServeur)} à ${formaterHeure(d, p.fuseauServeur)}`;

  return (
    <div data-filiale="cards">
      {etat === "en_cours" && <Actualisation secondes={15} />}
      <Wrap
        as="section"
        aria-labelledby="titre-enchere"
        className="flex flex-col gap-10 pt-36 pb-20"
      >
        <Link href="/cards#catalogue" className="bp-nav-lien flex items-center gap-2 self-start">
          <Icon nom="flecheGauche" taille={16} />
          Retour au catalogue
        </Link>
        <div className="grid grid-cols-[minmax(0,360px)_minmax(0,1fr)] gap-12 max-md:grid-cols-1">
          <div className="relative aspect-[63/88] overflow-hidden rounded-[18px] bg-noir">
            {e.carte.photo ? (
              <ImageProtegee>
                <Image
                  // Toujours la version filigranée, jamais l'original.
                  src={`/api/cartes/${e.carte.id}/photo`}
                  alt={`Carte ${e.carte.nom}`}
                  fill
                  draggable={false}
                  sizes="360px"
                  className="object-cover"
                />
              </ImageProtegee>
            ) : (
              <Image
                src="/images/logos/bp-cards.webp"
                alt=""
                fill
                sizes="360px"
                className="object-contain p-16 opacity-80"
              />
            )}
          </div>

          <div className="flex min-w-0 flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="libelle text-or-texte">Enchère · {e.carte.categorie.nom}</span>
              <h1
                id="titre-enchere"
                className="m-0 titre text-[clamp(32px,4vw,52px)] font-semibold"
              >
                {e.carte.nom}
              </h1>
            </div>
            <dl className="m-0 grid grid-cols-2 gap-6 max-sm:grid-cols-1">
              <div className="flex flex-col gap-1.5">
                <dt className="libelle">
                  {etat === "conclue" ? "Adjugée" : meilleure ? "Offre actuelle" : "Mise à prix"}
                </dt>
                <dd className="m-0 texte-or titre text-[44px] leading-none font-bold chiffres">
                  {formaterDollars(meilleure?.montant ?? e.montantDepart)}
                </dd>
              </div>
              <div className="flex flex-col gap-1.5">
                <dt className="libelle">Temps restant</dt>
                <dd className="m-0 titre text-[32px] leading-none font-bold chiffres">
                  {etat === "en_cours" ? (
                    <CompteARebours
                      fin={e.finPrevue.toISOString()}
                      maintenant={instant.toISOString()}
                    />
                  ) : (
                    "Terminée"
                  )}
                </dd>
                <dd className="m-0 text-sm text-texte-doux">Fin prévue le {quand(e.finPrevue)}</dd>
              </div>
            </dl>
            <p className="m-0 max-w-[620px] text-texte-doux">
              Pas minimum de {formaterDollars(e.pasMinimum)} entre deux offres.
              {e.tempsAdditionnelMin > 0 &&
                ` Une offre reçue dans les ${e.tempsAdditionnelMin} dernières minutes prolonge l’enchère d’autant.`}
            </p>

            {etat === "en_cours" ? (
              <FormulaireEnchere
                enchereId={e.id}
                minimum={formaterDollars(montantMinimum(e, e.offres))}
              />
            ) : (
              <p role="status" className="glass-site m-0 p-6 text-texte-doux">
                {etat === "conclue"
                  ? "Cette enchère est terminée : la carte a été vendue."
                  : "Cette enchère est terminée. La boutique contacte le meilleur enchérisseur."}
              </p>
            )}

            <section aria-labelledby="titre-offres" className="flex flex-col gap-3">
              <h2 id="titre-offres" className="m-0 titre text-xl font-semibold">
                Dernières offres
              </h2>
              {e.offres.length === 0 ? (
                <p className="m-0 text-texte-doux">Aucune offre pour l’instant.</p>
              ) : (
                <ol className="m-0 flex list-none flex-col p-0">
                  {e.offres.slice(0, OFFRES_AFFICHEES).map((o) => (
                    <li
                      key={o.id}
                      className="flex items-center justify-between gap-4 border-b border-[var(--bp-trait-8)] py-3"
                    >
                      <span className="text-texte-doux">{quand(o.date)}</span>
                      <span className="font-bold chiffres">{formaterDollars(o.montant)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>
        </div>
      </Wrap>
    </div>
  );
}

export default function PageEnchere({ params }: PageProps<"/cards/encheres/[id]">) {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <Enchere params={params} />
    </Suspense>
  );
}
