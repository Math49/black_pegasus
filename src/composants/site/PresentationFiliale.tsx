import Image from "next/image";
import { notFound } from "next/navigation";
import type { CodeFiliale } from "@/domaine/types";
import { lireFiliale } from "@/services/site";
import { BoutonAppeler } from "./BoutonAppeler";
import { NumerosTelephone } from "./NumerosTelephone";
import { Wrap } from "./Mise";

/** Identité et contact ; les catalogues sont livrés en F-3 et F-4. */
export async function PresentationFiliale({ code }: { code: CodeFiliale }) {
  const f = await lireFiliale(code);
  if (!f.visible) notFound();
  return (
    <div data-filiale={f.slug}>
      <Wrap as="section" className="flex flex-col items-center gap-7 py-20 text-center">
        <Image
          src={f.logo}
          alt=""
          width={240}
          height={240}
          className="rounded-full object-contain"
        />
        <h1 className="m-0 titre text-h1 font-semibold text-or-texte">{f.nom}</h1>
        <p className="m-0 max-w-[650px] text-lg leading-relaxed text-texte-doux">{f.accroche}</p>
        <NumerosTelephone telephone={f.telephone} className="text-2xl font-bold text-or-texte" />
        <p className="m-0 text-texte-doux">{f.horaires}</p>
        <BoutonAppeler telephone={f.telephone} />
      </Wrap>
    </div>
  );
}
