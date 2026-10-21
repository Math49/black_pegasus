import Image from "next/image";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import Link from "next/link";
import { lireParametresSite } from "@/services/site";
import { Rule } from "../ui/Rule";

const lien = "flex min-h-11 items-center lg:min-h-8 text-sm text-texte-attenue hover:text-texte";

export async function PiedDePage() {
  const { telephone, horaires, nomEntreprise } = await lireParametresSite();
  return (
    <footer className="relative border-t border-[var(--bp-or-22)] bg-noir">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-12 px-[clamp(16px,4vw,56px)] pt-16 pb-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-10">
          <div className="flex flex-col gap-4">
            <Image
              src="/images/bp-logo.png"
              alt={nomEntreprise}
              width={110}
              height={110}
              className="object-contain"
            />
            <span className="text-sm leading-[1.6] text-texte-attenue">
              Location de bateaux, d’avions et d’hélicoptères.
            </span>
          </div>
          <nav aria-label="Pied de page" className="flex flex-col gap-1">
            <h2 className="m-0 mb-2 libelle text-texte-doux">Navigation</h2>
            <Link className={lien} href="/">
              Accueil
            </Link>
            <Link className={lien} href="/flotte">
              La flotte
            </Link>
            <Link className={lien} href="/reglement">
              Règlement des locations
            </Link>
            <Link className={lien} href="/#maison">
              La maison
            </Link>
          </nav>
          <nav aria-label="La flotte" className="flex flex-col gap-1">
            <h2 className="m-0 mb-2 libelle text-texte-doux">La flotte</h2>
            <Link className={lien} href="/flotte?type=BATEAU">
              Bateaux
            </Link>
            <Link className={lien} href="/flotte?type=AVION">
              Avions
            </Link>
            <Link className={lien} href="/flotte?type=HELICOPTERE">
              Hélicoptères
            </Link>
          </nav>
          <div className="flex flex-col gap-3">
            <h2 className="m-0 mb-1.5 libelle text-texte-doux">Contact</h2>
            <NumerosTelephone
              telephone={telephone}
              className="w-fit texte-or text-2xl font-extrabold"
            />
            <span className="text-sm text-texte-attenue">{horaires}</span>
            <span className="text-sm text-texte-attenue">
              Réservation uniquement par téléphone en jeu
            </span>
          </div>
        </div>
        <Rule />
        <div className="flex flex-wrap justify-between gap-3 text-[12.5px] text-texte-attenue">
          <span>© {nomEntreprise}</span>
          <span>Entreprise fictive d’un serveur de jeu de rôle GTA V (FiveM)</span>
        </div>
      </div>
    </footer>
  );
}
