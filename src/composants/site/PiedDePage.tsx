import Image from "next/image";
import Link from "next/link";
import { lireFilialesVisibles, lireParametresSite } from "@/services/site";
import { NumerosTelephone } from "./NumerosTelephone";
import { Rule } from "../ui/Rule";
import { Icon } from "../ui/Icon";

const lien =
  "flex min-h-11 items-center text-sm text-texte-doux transition-colors hover:text-texte";

export async function PiedDePage() {
  const [p, filiales] = await Promise.all([lireParametresSite(), lireFilialesVisibles()]);
  return (
    <footer className="relative overflow-hidden border-t border-[var(--bp-or-22)] bg-noir">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[900px] max-w-full -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(closest-side, var(--bp-or-10), transparent)" }}
      />
      <div className="relative mx-auto flex max-w-[1280px] flex-col gap-12 px-[clamp(16px,4vw,56px)] pt-20 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div className="flex items-center gap-5">
            <Image
              src="/images/logos/bp-compagnie.webp"
              alt=""
              width={96}
              height={96}
              className="size-20 rounded-full object-contain ring-1 ring-[var(--bp-or-35)]"
            />
            <span className="texte-or titre text-[clamp(30px,4.4vw,60px)] leading-none font-bold tracking-[-0.02em]">
              {p.nomEntreprise}
            </span>
          </div>
          <a
            href="#contenu"
            className="flex min-h-11 items-center gap-3 text-sm text-texte-doux hover:text-texte"
          >
            Haut de page
            <span className="flex size-11 items-center justify-center rounded-full border border-[var(--bp-or-45)] text-or-icone">
              <Icon nom="flecheDroite" taille={18} className="-rotate-90" />
            </span>
          </a>
        </div>
        <Rule />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-10">
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
