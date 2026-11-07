import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { lireFilialesVisibles, lireParametresSite } from "@/services/site";
import { libelleFiliale } from "@/domaine/filiales";
import { texteBrut } from "@/domaine/textes";
import { Button } from "@/composants/ui/Button";
import { Icon } from "@/composants/ui/Icon";
import { Rule } from "@/composants/ui/Rule";
import { BoutonAppeler } from "@/composants/site/BoutonAppeler";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import { TexteEnLigne, TitreAccent } from "@/composants/site/Texte";
import { FONDS, FondAmbiance, HAUTEUR_EN_TETE, noir, Wrap } from "@/composants/site/Mise";

export async function generateMetadata() {
  const p = await lireParametresSite();
  return {
    title: { absolute: p.nomEntreprise },
    description: texteBrut(p.textesGroupe.accroche.texte, p),
    openGraph: { title: p.nomEntreprise, images: ["/images/logos/bp-compagnie.webp"] },
  };
}

async function AccueilGroupe() {
  const [p, filiales] = await Promise.all([lireParametresSite(), lireFilialesVisibles()]);
  const { accroche, presentation } = p.textesGroupe;
  return (
    <>
      <section className="relative">
        <FondAmbiance
          image={FONDS.skyline}
          decalageHaut={HAUTEUR_EN_TETE}
          voile={`linear-gradient(90deg, ${noir(94)}, ${noir(70)}), linear-gradient(180deg, transparent 50%, var(--bp-black))`}
        />
        <Wrap className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] items-center gap-12 pt-20 pb-24 max-md:grid-cols-1 max-md:gap-8 max-md:pt-12">
          <div className="flex flex-col items-start gap-7">
            <span className="libelle text-or-texte">{p.nomEntreprise}</span>
            <h1 className="m-0 titre text-h1 leading-[1.08] font-semibold text-balance">
              <TitreAccent titre={accroche.titre} />
            </h1>
            <p className="m-0 max-w-[600px] text-lg leading-[1.75] text-pretty text-texte-doux">
              <TexteEnLigne texte={accroche.texte} ctx={p} />
            </p>
            {filiales.length > 0 && (
              <Button href="#filiales" iconeFin="flecheDroite">
                Découvrir nos filiales
              </Button>
            )}
          </div>
          <div className="flex justify-center max-md:order-first">
            <Image
              src="/images/logos/bp-compagnie.webp"
              alt={`Logo ${p.nomEntreprise}`}
              width={360}
              height={360}
              priority
              className="aspect-square w-full max-w-[360px] rounded-full object-contain max-md:max-w-[200px]"
            />
          </div>
        </Wrap>
      </section>
      <Wrap
        as="section"
        id="filiales"
        aria-labelledby="titre-filiales"
        className="scroll-mt-6 pb-24"
      >
        <h2 id="titre-filiales" className="m-0 mb-9 titre text-h2 font-semibold">
          Nos filiales
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(310px,100%),1fr))] gap-6">
          {filiales.map((f) => (
            <Link
              key={f.code}
              href={`/${f.slug}`}
              data-filiale={f.slug}
              className={`glass-site flex min-w-0 flex-col items-start gap-5 rounded-[24px] border-t-2 border-t-[var(--bp-accent)] p-8 text-texte hover:border-[var(--bp-accent)] ${filiales.length === 1 ? "md:flex-row md:items-center md:gap-8" : ""}`}
            >
              <Image
                src={f.logo}
                alt=""
                width={112}
                height={112}
                className="shrink-0 rounded-full bg-noir object-contain"
              />
              <div className="flex min-w-0 flex-col gap-4">
                <span className="libelle text-or-texte">{libelleFiliale(f.code)}</span>
                <h3 className="m-0 titre text-2xl font-semibold">{f.nom}</h3>
                <p className="m-0 text-base leading-relaxed text-texte-doux">{f.accroche}</p>
              </div>
              <span
                className={`flex min-h-11 items-center gap-3 font-bold text-or-texte ${filiales.length === 1 ? "md:ml-auto" : "mt-auto"}`}
              >
                Découvrir <Icon nom="flecheDroite" taille={18} />
              </span>
            </Link>
          ))}
        </div>
      </Wrap>
      <Wrap as="section" id="groupe" aria-labelledby="titre-groupe" className="pb-24">
        <Rule className="mb-12" />
        <div className="grid grid-cols-2 gap-10 max-md:grid-cols-1">
          <h2 id="titre-groupe" className="m-0 titre text-h2 font-semibold">
            <TitreAccent titre={presentation.titre} />
          </h2>
          <p className="m-0 text-lg leading-[1.8] text-texte-doux">
            <TexteEnLigne texte={presentation.texte} ctx={p} />
          </p>
        </div>
      </Wrap>
      <Wrap as="section" aria-labelledby="titre-contacts" className="pb-24">
        <h2 id="titre-contacts" className="m-0 mb-9 titre text-h2 font-semibold">
          Nous contacter en jeu
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(310px,100%),1fr))] gap-6">
          {filiales.map((f) => (
            <div key={f.code} className="glass-site flex min-w-0 flex-col items-start gap-4 p-7">
              <h3 className="m-0 titre text-xl font-semibold">{f.nom}</h3>
              <NumerosTelephone telephone={f.telephone} className="texte-or text-2xl font-bold" />
              <p className="m-0 text-sm text-texte-doux">{f.horaires}</p>
              <BoutonAppeler telephone={f.telephone} />
            </div>
          ))}
        </div>
      </Wrap>
    </>
  );
}

export default function PageGroupe() {
  return (
    <Suspense fallback={null}>
      <AccueilGroupe />
    </Suspense>
  );
}
