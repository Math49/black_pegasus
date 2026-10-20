import { Button } from "../ui/Button";

/** Contenu des pages « introuvable » du site (affinées en phase 13). */
export function PageIntrouvable({ titre, texte }: { titre: string; texte: string }) {
  return (
    <div className="relative mx-auto flex min-h-[60vh] max-w-[640px] flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <span className="libelle text-or-texte">Erreur 404</span>
      <h1 className="m-0 titre text-[clamp(32px,4vw,48px)] font-semibold">{titre}</h1>
      <p className="m-0 text-[17px] leading-[1.6] text-texte-doux">{texte}</p>
      <div className="flex flex-wrap justify-center gap-3.5">
        <Button href="/flotte" iconeFin="flecheDroite">
          Voir la flotte
        </Button>
        <Button href="/" variante="verre">
          Retour à l’accueil
        </Button>
      </div>
    </div>
  );
}
