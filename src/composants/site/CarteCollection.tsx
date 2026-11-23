import Image from "next/image";
import Link from "next/link";
import { formaterDollars } from "@/domaine/argent";
import { etatCarte } from "@/domaine/cards";
import { cx } from "@/lib/classes";
import { CompteARebours } from "../ui/CompteARebours";
import { Icon } from "../ui/Icon";
import { ImageProtegee } from "./ImageProtegee";
import { PastilleEnchere } from "./PastilleEnchere";

/** Carte mise aux enchères : offre actuelle, temps restant, lien vers la page d'enchère. */
export type EnchereCarte = {
  href: string;
  /** Meilleure offre, ou mise à prix sans offre. */
  montant: number;
  avecOffre: boolean;
  /** ISO 8601 */
  fin: string;
  /** Fin de la durée choisie, avant un éventuel temps additionnel. */
  finDuree: string;
  maintenant: string;
  terminee: boolean;
};

/** Carte du catalogue Cards : photo au format carte à collectionner, prix, stock. */
export function CarteCollection({
  carte,
  enchere,
}: {
  carte: { nom: string; prix: number; stock: number; photoUrl: string | null; categorie: string };
  enchere?: EnchereCarte;
}) {
  const etat = enchere ? { epuisee: false, libelle: "Enchère" } : etatCarte(carte.stock);
  return (
    <article
      className={cx(
        "bp-vcard group relative h-full overflow-hidden",
        etat.epuisee && "bp-vcard--complet",
        enchere && "bp-vcard--enchere",
      )}
    >
      <div className="bp-vcard__media aspect-[63/88]">
        {carte.photoUrl ? (
          <ImageProtegee>
            <Image
              src={carte.photoUrl}
              alt={`Carte ${carte.nom}`}
              fill
              draggable={false}
              sizes="(max-width: 640px) 50vw, 260px"
              className="bp-vcard__photo transition-transform duration-700 group-hover:scale-105"
            />
          </ImageProtegee>
        ) : (
          // Visuel par défaut : logo Cards sur un dégradé de l'accent.
          <span
            className="bp-vcard__photo absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "radial-gradient(70% 55% at 50% 35%, var(--bp-or-35), transparent 70%), var(--bp-surface)",
            }}
          >
            <Image
              src="/images/logos/bp-cards.webp"
              alt=""
              width={140}
              height={140}
              className="w-1/2 rounded-full opacity-80"
            />
          </span>
        )}
        <span className="bp-vcard__fondu" aria-hidden="true" />
        {enchere ? (
          <>
            <PastilleEnchere
              fin={enchere.fin}
              maintenant={enchere.maintenant}
              className="absolute top-3 left-3 z-[2]"
            />
            {/* Temps restant posé en bas de la photo. */}
            <span className="absolute inset-x-3 bottom-3 z-[2] flex items-center justify-center gap-2 rounded-full border border-[var(--bp-trait-18)] bg-[var(--bp-noir-85)] px-3 py-1.5 text-sm">
              <Icon nom="horloge" taille={15} className="text-[var(--bp-accent-icone)]" />
              {enchere.terminee ? (
                "Enchère terminée"
              ) : (
                <CompteARebours
                  fin={enchere.fin}
                  finDuree={enchere.finDuree}
                  maintenant={enchere.maintenant}
                  className="font-bold chiffres text-texte"
                />
              )}
            </span>
          </>
        ) : (
          <span
            className={cx(
              "absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-bold",
              etat.epuisee
                ? "border border-[var(--bp-trait-18)] bg-[var(--bp-noir-85)] text-[var(--bp-text-off)]"
                : "border border-[var(--bp-or-45)] bg-[var(--bp-fond-badge-or)] text-or-texte",
            )}
          >
            {etat.libelle}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
        <span className="libelle text-[10px]">{carte.categorie}</span>
        <h3 className="m-0 titre text-lg leading-tight font-semibold">{carte.nom}</h3>
        {enchere ? (
          <span className="mt-auto flex flex-col gap-3">
            <span className="flex flex-col gap-1">
              <span className="libelle text-[10px]">
                {enchere.avecOffre ? "Offre actuelle" : "Mise à prix"}
              </span>
              <span className="texte-or titre text-2xl font-bold chiffres">
                {formaterDollars(enchere.montant)}
              </span>
            </span>
            {/* Toute la carte mène à l'enchère : le bouton porte un lien étiré sur l'article. */}
            <Link
              href={enchere.href}
              className="bp-btn bp-btn--or bp-btn--site-petit justify-center after:absolute after:inset-0 after:z-10 after:rounded-[22px]"
            >
              <Icon nom="marteau" taille={18} />
              {enchere.terminee ? "Voir l’enchère" : "Enchérir"}
              <span className="sr-only"> sur {carte.nom}</span>
            </Link>
          </span>
        ) : (
          <span className="mt-auto texte-or titre text-2xl font-bold chiffres">
            {formaterDollars(carte.prix)}
          </span>
        )}
      </div>
    </article>
  );
}
