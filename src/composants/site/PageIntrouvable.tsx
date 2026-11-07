import Image from "next/image";
import type { ReactNode } from "react";
import { Button } from "../ui/Button";
import { FONDS, FondAmbiance, noir } from "./Mise";

/** Page d'erreur du site (404, 500) : fond d'ambiance, logo, message et retours. */
export function PageErreur({
  code,
  titre,
  texte,
  actions,
}: {
  code: string;
  titre: string;
  texte: string;
  actions?: ReactNode;
}) {
  return (
    <div className="relative isolate overflow-hidden">
      <FondAmbiance
        image={FONDS.coucher}
        position="center 60%"
        voile={`linear-gradient(180deg, ${noir(70)} 0%, ${noir(80)} 55%, var(--bp-black) 100%)`}
        className="-z-10"
      />
      <div className="relative mx-auto flex min-h-[70vh] max-w-[640px] flex-col items-center justify-center gap-6 px-4 py-24 text-center">
        <Image src="/images/bp-logo.png" alt="" width={84} height={84} className="object-contain" />
        <span className="libelle text-or-texte">{code}</span>
        <h1 className="m-0 titre text-[clamp(32px,4vw,48px)] font-semibold">{titre}</h1>
        <span aria-hidden="true" className="filet-or h-px w-24" />
        <p className="m-0 text-[17px] leading-[1.6] text-texte-doux">{texte}</p>
        <div className="flex flex-wrap justify-center gap-3.5">
          {actions ?? (
            <>
              <Button href="/location/flotte" iconeFin="flecheDroite">
                Voir la flotte
              </Button>
              <Button href="/" variante="verre">
                Retour à l’accueil
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Contenu des pages « introuvable » du site. */
export function PageIntrouvable({ titre, texte }: { titre: string; texte: string }) {
  return <PageErreur code="Erreur 404" titre={titre} texte={texte} />;
}
