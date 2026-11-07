import { EnTeteFlottant } from "./anime/Anime";
import { lireFilialesVisibles, lireParametresSite } from "@/services/site";
import { BarreSite, LogoSite } from "./BarreSite";
import { NavSite } from "./NavSite";

function Cadre({ children }: { children: React.ReactNode }) {
  return <EnTeteFlottant>{children}</EnTeteFlottant>;
}

/** Les données restent lues côté serveur ; la barre suit la route lors des navigations. */
export async function EnTete() {
  const [p, filiales] = await Promise.all([lireParametresSite(), lireFilialesVisibles()]);
  return (
    <Cadre>
      <NavSite
        nomGroupe={p.nomEntreprise}
        filiales={filiales.map(({ code, slug, nom, logo }) => ({ code, slug, nom, logo }))}
      />
    </Cadre>
  );
}

/** Version sans données affichée pendant le chargement. */
export function EnTeteSquelette() {
  return (
    <Cadre>
      <BarreSite>
        <LogoSite nom="BLACK PÉGASUS" logo="/images/logos/bp-compagnie.webp" href="/" />
        <span className="h-[46px]" />
      </BarreSite>
    </Cadre>
  );
}
