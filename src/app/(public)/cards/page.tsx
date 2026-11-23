import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { correspondRecherche, decouperNomCategorie, regrouperCartes } from "@/domaine/cards";
import { cx } from "@/lib/classes";
import { slugifier } from "@/domaine/vehicules";
import { finInitiale, meilleureOffre } from "@/domaine/encheres";
import { maintenant } from "@/lib/horloge";
import { lireCartesPubliques } from "@/services/cards";
import { lireEncheresOuvertes } from "@/services/encheres";
import { lireFiliale } from "@/services/site";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { CarteCollection } from "@/composants/site/CarteCollection";
import { RangeeDefilante } from "@/composants/site/RangeeDefilante";
import { HeroFiliale } from "@/composants/site/PresentationFiliale";
import { Wrap } from "@/composants/site/Mise";
import { Apparition } from "@/composants/site/anime/Anime";
import { EnTeteSection } from "@/composants/site/Vitrine";
import { Button } from "@/composants/ui/Button";
import { Icon } from "@/composants/ui/Icon";

export async function generateMetadata() {
  const f = await lireFiliale("BPC");
  return { title: f.nom, description: f.accroche };
}

async function Cards({ searchParams }: { searchParams: PageProps<"/cards">["searchParams"] }) {
  const f = await lireFiliale("BPC");
  if (!f.visible) notFound();
  const params = await searchParams;
  const [cartes, encheres, instant] = await Promise.all([
    lireCartesPubliques(),
    lireEncheresOuvertes(),
    maintenant(),
  ]);
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
            <div className="grid items-start gap-10 lg:grid-cols-[280px_minmax(0,1fr)]">
              <aside
                aria-label="Filtrer le catalogue"
                className="glass-site flex min-w-0 flex-col gap-5 rounded-[24px] p-5 lg:sticky lg:top-28 lg:max-h-[calc(100svh-8rem)] lg:overflow-y-auto"
              >
                <form
                  action="/cards#catalogue"
                  role="search"
                  aria-label="Rechercher une carte"
                  className="flex min-w-0 flex-col gap-2"
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
                      className="bp-fld bp-fld--site bp-fld--avec-icone min-h-11 w-full"
                    />
                  </label>
                  <Button type="submit" variante="verre" taille="site-petit" className="w-full">
                    Rechercher
                  </Button>
                </form>
                <nav aria-label="Catégorie de cartes" className="flex min-w-0 flex-col gap-2">
                  <span className="libelle text-texte-doux">Catégories</span>
                  {/* Mobile : rangée défilante ; grand écran : liste verticale. */}
                  <RangeeDefilante className="relative m-0 flex list-none gap-1.5 overflow-x-auto p-0 pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
                    {[
                      {
                        cle: "toutes",
                        nom: "Toutes les cartes",
                        nombre: cartes.length,
                        href: lien(),
                      },
                      ...groupes.map((g) => ({
                        cle: slugifier(g.categorie.nom),
                        nom: g.categorie.nom,
                        nombre: g.cartes.length,
                        href: lien(slugifier(g.categorie.nom)),
                      })),
                    ].map((o) => {
                      const actif =
                        (categorie ? slugifier(categorie.categorie.nom) : "toutes") === o.cle;
                      const { code, titre } = decouperNomCategorie(o.nom);
                      return (
                        <li key={o.cle} className="flex-none lg:flex-auto">
                          <Link
                            href={o.href}
                            aria-current={actif ? "true" : undefined}
                            className={cx(
                              "flex min-h-11 items-center justify-between gap-3 rounded-[14px] border px-3.5 py-2 text-texte transition-colors",
                              actif
                                ? "border-[color-mix(in_srgb,var(--bp-accent)_45%,transparent)] bg-[color-mix(in_srgb,var(--bp-accent)_12%,transparent)]"
                                : "border-transparent hover:bg-[var(--bp-voile-6)]",
                            )}
                          >
                            <span className="flex min-w-0 flex-col">
                              {code && (
                                <span className="libelle text-[10px] text-texte-attenue">
                                  {code}
                                </span>
                              )}
                              <span className="text-sm leading-snug font-bold whitespace-nowrap lg:whitespace-normal">
                                {titre}
                              </span>
                            </span>
                            <span className="flex-none rounded-full bg-[var(--bp-voile-6)] px-2 py-0.5 text-xs chiffres text-texte-doux">
                              {o.nombre}
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </RangeeDefilante>
                </nav>
              </aside>

              <div className="flex min-w-0 flex-col gap-12">
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
                              // Toujours la version filigranée, jamais l'original.
                              photoUrl: c.photo ? `/api/cartes/${c.id}/photo` : null,
                              categorie: g.categorie.nom,
                            }}
                            enchere={(() => {
                              const e = encheres.get(c.id);
                              if (!e) return undefined;
                              const m = meilleureOffre(e.offres);
                              return {
                                href: `/cards/encheres/${e.id}`,
                                montant: m?.montant ?? e.montantDepart,
                                avecOffre: m !== null,
                                fin: e.finPrevue.toISOString(),
                                finDuree: finInitiale(e.debut, e.dureeHeures).toISOString(),
                                maintenant: instant.toISOString(),
                                terminee: instant >= e.finPrevue,
                              };
                            })()}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
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
