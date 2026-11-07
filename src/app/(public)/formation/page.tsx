import { Suspense } from "react";
import { notFound } from "next/navigation";
import { lireFiliale, lireParametresSite } from "@/services/site";
import { lirePermisPublics } from "@/services/formation";
import { regrouperPermis } from "@/domaine/formation";
import { formaterDollars } from "@/domaine/argent";
import { FormulaireFormation } from "@/composants/site/FormulaireFormation";
import { HeroFiliale } from "@/composants/site/PresentationFiliale";
import { TexteRiche } from "@/composants/site/Texte";
import { Wrap } from "@/composants/site/Mise";
import { Apparition, Cascade, Inclinable } from "@/composants/site/anime/Anime";
import { ElementHero, EnTeteSection, Surtitre } from "@/composants/site/Vitrine";
import { Button } from "@/composants/ui/Button";
import { Icon, type NomIcone } from "@/composants/ui/Icon";

export async function generateMetadata() {
  const f = await lireFiliale("BPF");
  return { title: f.nom, description: f.accroche };
}

const MODALITES: { cle: "prerequis" | "duree" | "epreuves"; titre: string; icone: NomIcone }[] = [
  { cle: "prerequis", titre: "Prérequis", icone: "bouclierValide" },
  { cle: "duree", titre: "Durée", icone: "horloge" },
  { cle: "epreuves", titre: "Épreuves", icone: "document" },
];

const ETAPES_CONTACT = [
  "Envoyez votre demande avec le permis visé.",
  "Notre équipe vous rappelle en jeu pour fixer les modalités.",
  "Vous passez les épreuves ; l’État délivre la licence.",
];

async function Formation() {
  const f = await lireFiliale("BPF");
  if (!f.visible) notFound();
  const [permis, p] = await Promise.all([lirePermisPublics(), lireParametresSite()]);
  const ctx = { ...p, telephone: f.telephone, horaires: f.horaires };
  const groupes = regrouperPermis(permis);
  return (
    <div data-filiale="formation">
      <HeroFiliale
        filiale={f}
        actions={
          <Button href="#permis" variante="verre" iconeFin="flecheDroite">
            Voir les licences
          </Button>
        }
      />

      <Wrap
        as="section"
        id="permis"
        aria-labelledby="titre-permis"
        className="flex scroll-mt-28 flex-col gap-14 py-20"
      >
        <EnTeteSection id="titre-permis" surtitre="Catalogue" titre="Nos licences et formations">
          <p className="m-0 max-w-[620px] text-lg leading-relaxed text-texte-doux">
            La délivrance des licences relève de l’État. Contactez notre équipe pour préparer votre
            parcours.
          </p>
        </EnTeteSection>
        {groupes.length === 0 && (
          <p className="m-0 text-texte-doux">
            Le catalogue sera prochainement disponible. Vous pouvez déjà contacter notre équipe.
          </p>
        )}
        <div
          className={
            // Une licence par domaine : les domaines se placent côte à côte.
            groupes.every((g) => g.permis.length === 1)
              ? "grid grid-cols-[repeat(auto-fit,minmax(min(440px,100%),1fr))] gap-x-6 gap-y-14"
              : "flex flex-col gap-14"
          }
        >
          {groupes.map((g) => (
            <section
              key={g.domaine.id}
              aria-labelledby={`domaine-${g.domaine.id}`}
              className="flex flex-col gap-7"
            >
              <Apparition className="flex items-center gap-5">
                <h3
                  id={`domaine-${g.domaine.id}`}
                  className="m-0 titre text-[clamp(24px,2.4vw,32px)] font-semibold text-or-texte"
                >
                  {g.domaine.nom}
                </h3>
                <span className="filet-or h-px flex-1" aria-hidden="true" />
                <span className="libelle">
                  {g.permis.length} licence{g.permis.length > 1 ? "s" : ""}
                </span>
              </Apparition>
              <Cascade className="grid h-full grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] gap-6">
                {g.permis.map((licence) => (
                  <ElementHero key={licence.id}>
                    <Inclinable intensite={4} className="h-full rounded-[28px]">
                      <article className="glass-site flex h-full min-w-0 flex-col gap-6 rounded-[28px] p-8 transition-colors duration-500 hover:border-[var(--bp-or-45)]">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex min-w-0 flex-col gap-2">
                            <span className="libelle">{g.domaine.nom}</span>
                            <h4 className="m-0 titre text-[26px] leading-tight font-semibold">
                              {licence.nom}
                            </h4>
                          </div>
                          <span className="texte-or titre text-[clamp(30px,3vw,40px)] leading-none font-bold chiffres">
                            {formaterDollars(licence.prix)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-3 text-texte-doux">
                          <TexteRiche source={licence.description} ctx={ctx} />
                        </div>
                        <dl className="m-0 mt-auto flex flex-col gap-4 border-t border-[var(--bp-trait-10)] pt-6 text-sm">
                          {MODALITES.filter((m) => licence[m.cle]).map((m) => (
                            <div
                              key={m.cle}
                              className="grid grid-cols-[40px_minmax(0,1fr)] items-center gap-x-4 gap-y-1"
                            >
                              <dt className="contents font-bold text-texte">
                                <span
                                  aria-hidden="true"
                                  className="row-span-2 flex size-10 items-center justify-center self-start rounded-full border border-[var(--bp-or-35)] text-or-icone"
                                >
                                  <Icon nom={m.icone} taille={18} trait={1.5} />
                                </span>
                                <span>{m.titre}</span>
                              </dt>
                              <dd className="col-start-2 m-0 whitespace-pre-line text-texte-doux">
                                {licence[m.cle]}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </article>
                    </Inclinable>
                  </ElementHero>
                ))}
              </Cascade>
            </section>
          ))}
        </div>
      </Wrap>

      <section
        id="contact"
        aria-labelledby="titre-contact"
        className="relative scroll-mt-28 overflow-hidden pt-12 pb-28"
      >
        <div
          aria-hidden="true"
          className="absolute top-1/3 left-[-10%] size-[640px] rounded-full"
          style={{ background: "radial-gradient(closest-side, var(--bp-or-10), transparent)" }}
        />
        <Wrap className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] items-start gap-14 max-lg:grid-cols-1">
          <Apparition className="flex flex-col gap-6 lg:sticky lg:top-32">
            <Surtitre>Contact</Surtitre>
            <h2
              id="titre-contact"
              className="m-0 titre text-[clamp(34px,4vw,56px)] leading-[1.05] font-semibold"
            >
              Parlons de votre formation
            </h2>
            <p className="m-0 text-lg leading-relaxed text-texte-doux">
              Laissez votre nom RP, votre téléphone en jeu et le permis qui vous intéresse. Notre
              équipe vous recontactera pour organiser la suite.
            </p>
            <ol className="m-0 flex list-none flex-col gap-4 p-0">
              {ETAPES_CONTACT.map((e, i) => (
                <li key={e} className="flex items-center gap-4">
                  <span className="w-9 flex-none texte-or titre text-2xl font-bold">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="text-texte-doux">{e}</span>
                </li>
              ))}
            </ol>
          </Apparition>
          <Apparition delai={0.1}>
            <FormulaireFormation
              permis={permis.map((licence) => ({
                id: licence.id,
                nom: licence.nom,
                domaine: licence.domaine.nom,
              }))}
            />
          </Apparition>
        </Wrap>
      </section>
    </div>
  );
}

export default function PageFormation() {
  return (
    <Suspense fallback={<div className="min-h-svh" />}>
      <Formation />
    </Suspense>
  );
}
