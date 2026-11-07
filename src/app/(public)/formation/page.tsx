import { Suspense } from "react";
import Image from "next/image";
import { notFound } from "next/navigation";
import { lireFiliale, lireParametresSite } from "@/services/site";
import { lirePermisPublics } from "@/services/formation";
import { regrouperPermis } from "@/domaine/formation";
import { formaterDollars } from "@/domaine/argent";
import { FormulaireFormation } from "@/composants/site/FormulaireFormation";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { TexteRiche } from "@/composants/site/Texte";
import { FONDS, FondAmbiance, HAUTEUR_EN_TETE, noir, Wrap } from "@/composants/site/Mise";

export async function generateMetadata() {
  const f = await lireFiliale("BPF");
  return { title: f.nom, description: f.accroche };
}

async function Formation() {
  const f = await lireFiliale("BPF");
  if (!f.visible) notFound();
  const [permis, p] = await Promise.all([lirePermisPublics(), lireParametresSite()]);
  const ctx = { ...p, telephone: f.telephone, horaires: f.horaires };
  const groupes = regrouperPermis(permis);
  return (
    <div data-filiale="formation">
      <section className="relative">
        <FondAmbiance
          image={FONDS.piste}
          decalageHaut={HAUTEUR_EN_TETE}
          voile={`linear-gradient(90deg, ${noir(94)}, ${noir(70)}), linear-gradient(180deg, transparent, var(--bp-black))`}
        />
        <Wrap className="grid grid-cols-[minmax(0,1fr)_240px] items-center gap-10 py-16 max-md:grid-cols-1">
          <div className="flex flex-col items-start gap-6">
            <h1 className="m-0 titre text-h1 leading-tight font-semibold">{f.nom}</h1>
            <p className="m-0 text-xl leading-relaxed text-texte-doux">{f.accroche}</p>
            <NumerosTelephone
              telephone={f.telephone}
              className="text-2xl font-bold text-or-texte"
            />
            <p className="m-0 text-texte-doux">{f.horaires}</p>
            <BoutonAppeler telephone={f.telephone} />
          </div>
          <Image
            src={f.logo}
            alt=""
            width={240}
            height={240}
            priority
            className="rounded-full object-contain max-md:order-first max-md:w-40"
          />
        </Wrap>
      </section>
      <Wrap
        as="section"
        id="permis"
        aria-labelledby="titre-permis"
        className="flex flex-col gap-10 py-12"
      >
        <div className="flex flex-col gap-3">
          <h2 id="titre-permis" className="m-0 titre text-h2 font-semibold">
            Nos licences et formations
          </h2>
          <p className="m-0 text-texte-doux">
            La délivrance des licences relève de l’État. Contactez notre équipe pour préparer votre
            parcours.
          </p>
        </div>
        {groupes.length === 0 && (
          <p className="m-0 text-texte-doux">
            Le catalogue sera prochainement disponible. Vous pouvez déjà contacter notre équipe.
          </p>
        )}
        {groupes.map((g) => (
          <section
            key={g.domaine.id}
            aria-labelledby={`domaine-${g.domaine.id}`}
            className="flex flex-col gap-5"
          >
            <h3
              id={`domaine-${g.domaine.id}`}
              className="m-0 titre text-2xl font-semibold text-or-texte"
            >
              {g.domaine.nom}
            </h3>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(340px,100%),1fr))] gap-6">
              {g.permis.map((licence) => (
                <article key={licence.id} className="glass-site flex min-w-0 flex-col gap-5 p-7">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h4 className="m-0 titre text-xl font-semibold">{licence.nom}</h4>
                    <span className="text-2xl font-bold chiffres text-or-texte">
                      {formaterDollars(licence.prix)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <TexteRiche source={licence.description} ctx={ctx} />
                  </div>
                  <dl className="m-0 flex flex-col gap-4 text-sm">
                    {[
                      ["Prérequis", licence.prerequis],
                      ["Durée", licence.duree],
                      ["Épreuves", licence.epreuves],
                    ]
                      .filter(([, texte]) => texte)
                      .map(([titre, texte]) => (
                        <div key={titre}>
                          <dt className="mb-1 font-bold text-texte">{titre}</dt>
                          <dd className="m-0 whitespace-pre-line text-texte-doux">{texte}</dd>
                        </div>
                      ))}
                  </dl>
                </article>
              ))}
            </div>
          </section>
        ))}
      </Wrap>
      <Wrap
        as="section"
        id="contact"
        aria-labelledby="titre-contact"
        className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-10 pt-12 pb-24 max-lg:grid-cols-1"
      >
        <div className="flex flex-col gap-5">
          <h2 id="titre-contact" className="m-0 titre text-h2 font-semibold">
            Parlons de votre formation
          </h2>
          <p className="m-0 leading-relaxed text-texte-doux">
            Laissez votre nom RP, votre téléphone en jeu et le permis qui vous intéresse. Notre
            équipe vous recontactera pour organiser la suite.
          </p>
        </div>
        <FormulaireFormation
          permis={permis.map((licence) => ({
            id: licence.id,
            nom: licence.nom,
            domaine: licence.domaine.nom,
          }))}
        />
      </Wrap>
    </div>
  );
}
export default function PageFormation() {
  return (
    <Suspense fallback={null}>
      <Formation />
    </Suspense>
  );
}
