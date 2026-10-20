import Image from "next/image";
import Link from "next/link";
import { lireParametresSite } from "@/services/site";
import { Button } from "../ui/Button";
import { BoutonAppeler } from "./BoutonAppeler";
import { NavSite } from "./NavSite";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-3 text-texte">
      <Image
        src="/images/bp-logo.png"
        alt=""
        width={46}
        height={46}
        priority
        className="object-contain"
      />
      <span className="flex flex-col gap-[3px]">
        <span className="texte-or mot-symbole text-base">BLACK PÉGASUS</span>
        <span className="text-[9px] font-bold tracking-[0.32em] text-texte-attenue">
          AMERICAN TRANSPORTS
        </span>
        <span className="sr-only">– Accueil</span>
      </span>
    </Link>
  );
}

function Cadre({ children }: { children: React.ReactNode }) {
  return (
    <header className="relative z-30 mx-auto w-full max-w-[1280px] px-[clamp(16px,4vw,56px)] pt-6">
      <div className="glass-site flex flex-wrap items-center justify-between gap-x-7 gap-y-4 rounded-[28px] py-2.5 pr-3 pl-[18px] lg:rounded-full">
        {children}
      </div>
    </header>
  );
}

/** En-tête commun du site : verre en pilule, navigation, espace admin, téléphone. */
export async function EnTete() {
  const { telephone } = await lireParametresSite();
  return (
    <Cadre>
      <Logo />
      <NavSite
        actions={
          <>
            <Button
              href="/admin/connexion"
              variante="verre"
              taille="site-petit"
              icone="cadenas"
              className="min-h-[46px]"
            >
              Espace admin
            </Button>
            <BoutonAppeler
              telephone={telephone}
              libelle={telephone}
              taille="site-petit"
              className="min-h-[46px] px-5"
            />
          </>
        }
      />
    </Cadre>
  );
}

/** Version sans données affichée pendant le chargement. */
export function EnTeteSquelette() {
  return (
    <Cadre>
      <Logo />
      <span className="h-[46px]" />
    </Cadre>
  );
}
