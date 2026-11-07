import { Suspense } from "react";
import { notFound } from "next/navigation";
import { correspondRecherche, regrouperCartes } from "@/domaine/cards";
import { slugifier } from "@/domaine/vehicules";
import { lireCartesPubliques } from "@/services/cards";
import { lireFiliale } from "@/services/site";
import { urlPhoto } from "@/services/stockage";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { CarteCollection } from "@/composants/site/CarteCollection";
import { HeroFiliale } from "@/composants/site/PresentationFiliale";
import { Wrap } from "@/composants/site/Mise";
import { Apparition } from "@/composants/site/anime/Anime";
import { EnTeteSection } from "@/composants/site/Vitrine";
import { Button } from "@/composants/ui/Button";
import { Icon } from "@/composants/ui/Icon";
import { Seg } from "@/composants/ui/Seg";

export async function generateMetadata() {
  const f = await lireFiliale("BPC");
  return { title: f.nom, description: f.accroche };
}

async function Cards({ searchParams }: { searchParams: PageProps<"/cards">["searchParams"] }) {
  const f = await lireFiliale("BPC");
  if (!f.visible) notFound();
  const params = await searchParams;
  const cartes = await lireCartesPubliques();
  const groupes = regrouperCartes(cartes);
  const categorie = groupes.find((g) => slugifier(g.categorie.nom) === params.categorie);
  const q = typeof params.q === "string" ? params.q.slice(0, 80) : "";
  const affiches = groupes
    .filter((g) => !categorie || g === categorie)
    .map((g) => ({ ...g, cartes: g.cartes.filter((c) => correspondRecherche(c.nom, q)) }))
    .filter((g) => g.cartes.length > 0);
  const lien = (cat?: string) => {
    const p = new URLSearchParams();
    if (cat) p.set("categorie", cat);
    if (q) p.set("q", q);
    const s = p.toString();
    return `/cards${s ? `?${s}` : ""}#catalogue`;
  };

  return (
    <div data-filiale="cards">
      <HeroFiliale
        filiale={f}
        actions={
          <Button href="#catalogue" variante="verre" iconeFin="flecheDroite">
            Voir le catalogue
          </Button>
        }
      />
      <Wrap
        as="section"
        id="catalogue"
        aria-labelledby="titre-catalogue"
        className="flex scroll-mt-28 flex-col gap-10 py-20"
      >
        <EnTeteSection id="titre-catalogue" surtitre="Catalogue" titre="Nos cartes à collectionner">
          <p className="m-0 max-w-[620px] text-lg leading-relaxed text-texte-doux">
            Stock mis à jour par la boutique. Pour acheter une carte, appelez-nous en jeu : l’équipe
            vous la réserve.
          </p>
        </EnTeteSection>

        {groupes.length === 0 ? (
          <p className="m-0 text-texte-doux">
            Le catalogue sera prochainement disponible. Vous pouvez déjà appeler la boutique.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <Seg
                variante="site"
                libelle="Catégorie de cartes"
                valeur={categorie ? slugifier(categorie.categorie.nom) : "toutes"}
                options={[
                  { valeur: "toutes", libelle: "Toutes", compteur: cartes.length, href: lien() },
                  ...groupes.map((g) => ({
                    valeur: slugifier(g.categorie.nom),
                    libelle: g.categorie.nom,
                    compteur: g.cartes.length,
                    href: lien(slugifier(g.categorie.nom)),
                  })),
                ]}
              />
              <form
                action="/cards#catalogue"
                role="search"
                aria-label="Rechercher une carte"
                className="flex min-w-0 items-center gap-2"
              >
                {categorie && (
                  <input
                    type="hidden"
                    name="categorie"
                    value={slugifier(categorie.categorie.nom)}
                  />
                )}
                <label className="bp-champ-cadre min-w-0">
                  <Icon nom="recherche" taille={15} />
                  <span className="sr-only">Nom de la carte</span>
                  <input
                    type="search"
                    name="q"
                    defaultValue={q}
                    maxLength={80}
                    placeholder="Rechercher une carte"
                    className="bp-fld bp-fld--site bp-fld--avec-icone min-h-11 w-64 max-w-full"
                  />
                </label>
                <Button type="submit" variante="verre" taille="site-petit">
                  Rechercher
                </Button>
              </form>
            </div>

            {affiches.length === 0 && (
              <p role="status" className="m-0 text-texte-doux">
                Aucune carte ne correspond à « {q} ».
              </p>
            )}
            {affiches.map((g) => (
              <section
                key={g.categorie.id}
                aria-labelledby={`categorie-${g.categorie.id}`}
                className="flex flex-col gap-6"
              >
                <Apparition className="flex items-center gap-5">
                  <h2
                    id={`categorie-${g.categorie.id}`}
                    className="m-0 titre text-[clamp(24px,2.4vw,32px)] font-semibold text-or-texte"
                  >
                    {g.categorie.nom}
                  </h2>
                  <span className="filet-or h-px flex-1" aria-hidden="true" />
                </Apparition>
                <ul className="bp-entree m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(200px,100%),1fr))] gap-5 p-0">
                  {g.cartes.map((c) => (
                    <li key={c.id}>
                      <CarteCollection
                        carte={{
                          nom: c.nom,
                          prix: c.prix,
                          stock: c.stock,
                          photoUrl: c.photo ? urlPhoto(c.photo) : null,
                          categorie: g.categorie.nom,
                        }}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <Apparition className="glass-site flex flex-wrap items-center justify-center gap-x-6 gap-y-3 self-center rounded-[28px] py-3.5 pr-4 pl-7 sm:rounded-full">
              <span className="libelle text-texte-doux">Achat par téléphone en jeu</span>
              <span className="text-[15px]">{f.horaires}</span>
              <BoutonAppeler
                telephone={f.telephone}
                libelle="Appeler pour acheter · {numero}"
                className="min-h-[46px]"
              />
            </Apparition>
          </>
        )}
      </Wrap>
    </div>
  );
}

export default function PageCards({ searchParams }: PageProps<"/cards">) {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <Cards searchParams={searchParams} />
    </Suspense>
  );
}
