import Image from "next/image";
import Link from "next/link";
import { lireFilialesVisibles, lireParametresSite } from "@/services/site";
import { NumerosTelephone } from "./NumerosTelephone";
import { Rule } from "../ui/Rule";

const lien = "flex min-h-11 items-center text-sm text-texte-doux hover:text-texte";

export async function PiedDePage() {
  const [p, filiales] = await Promise.all([lireParametresSite(), lireFilialesVisibles()]);
  return (
    <footer className="relative border-t border-[var(--bp-or-22)] bg-noir">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-[clamp(16px,4vw,56px)] pt-14 pb-8">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-10">
          <div className="flex flex-col items-start gap-4">
            <Image
              src="/images/logos/bp-compagnie.webp"
              alt={p.nomEntreprise}
              width={110}
              height={110}
              className="rounded-full object-contain"
            />
            <span className="titre text-lg font-semibold">{p.nomEntreprise}</span>
          </div>
          <nav aria-label="Pied de page" className="flex flex-col gap-1">
            <h2 className="m-0 mb-2 libelle text-texte-doux">Nos filiales</h2>
            <Link href="/" className={lien}>
              Accueil du groupe
            </Link>
            {filiales.map((f) => (
              <Link key={f.code} href={`/${f.slug}`} className={lien}>
                {f.nom}
              </Link>
            ))}
            {filiales.some((f) => f.code === "BPL") && (
              <>
                <Link href="/location/flotte" className={lien}>
                  La flotte
                </Link>
                <Link href="/location/reglement" className={lien}>
                  Règlement des locations
                </Link>
              </>
            )}
          </nav>
          {filiales.map((f) => (
            <div key={f.code} className="flex min-w-0 flex-col items-start gap-3">
              <h2 className="m-0 mb-2 libelle text-texte-doux">{f.nom}</h2>
              <NumerosTelephone telephone={f.telephone} className="texte-or text-xl font-bold" />
              <span className="text-sm text-texte-doux">{f.horaires}</span>
            </div>
          ))}
        </div>
        <Rule />
        <div className="flex flex-wrap justify-between gap-3 text-[12.5px] text-texte-attenue">
          <span>© {p.nomEntreprise}</span>
          <span>Entreprise fictive d’un serveur de jeu de rôle GTA V (FiveM)</span>
        </div>
      </div>
    </footer>
  );
}
