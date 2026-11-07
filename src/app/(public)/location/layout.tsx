import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { lireFiliale } from "@/services/site";
import { NumerosTelephone } from "@/composants/site/NumerosTelephone";
import { Wrap } from "@/composants/site/Mise";

async function SectionLocation({ children }: { children: React.ReactNode }) {
  const filiale = await lireFiliale("BPL");
  if (!filiale.visible) notFound();
  return (
    <div data-filiale="location">
      <Wrap
        as="nav"
        aria-label="Navigation Location"
        className="z-10 flex flex-wrap items-center gap-x-6 gap-y-1 py-4 text-sm"
      >
        <Link className="bp-nav-lien" href="/location">
          {filiale.nom}
        </Link>
        <Link className="bp-nav-lien" href="/location/flotte">
          La flotte
        </Link>
        <Link className="bp-nav-lien" href="/location/reglement">
          Règlement
        </Link>
        <span className="flex flex-wrap items-center gap-x-4 gap-y-2 text-texte-attenue lg:ml-auto">
          <NumerosTelephone telephone={filiale.telephone} className="font-bold text-or-texte" />
          <span>{filiale.horaires}</span>
        </span>
      </Wrap>
      {children}
    </div>
  );
}

export default function LayoutLocation({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <SectionLocation>{children}</SectionLocation>
    </Suspense>
  );
}
