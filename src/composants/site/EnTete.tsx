import Image from "next/image";
import Link from "next/link";
import { lireFilialesVisibles, lireParametresSite } from "@/services/site";
import { Button } from "../ui/Button";
import { NavSite } from "./NavSite";

export function Logo({ nom }: { nom?: string }) {
  return (
    <Link href="/" className="flex items-center gap-3 text-texte">
      <Image
        src="/images/logos/bp-compagnie.webp"
        alt=""
        width={46}
        height={46}
        priority
        className="rounded-full object-contain"
      />
      <span className="flex flex-col gap-[3px]">
        <span className="max-w-[160px] texte-or mot-symbole text-sm sm:max-w-[220px]">
          {nom ?? "BLACK PÉGASUS"}
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
  const [p, filiales] = await Promise.all([lireParametresSite(), lireFilialesVisibles()]);
  return (
    <Cadre>
      <Logo nom={p.nomEntreprise} />
      <NavSite
        filiales={filiales.map(({ code, slug }) => ({ code, slug }))}
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
