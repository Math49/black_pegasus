import Image from "next/image";
import { formaterDollars } from "@/domaine/argent";
import { etatCarte } from "@/domaine/cards";
import { cx } from "@/lib/classes";

/** Carte du catalogue Cards : photo au format carte à collectionner, prix, stock. */
export function CarteCollection({
  carte,
}: {
  carte: { nom: string; prix: number; stock: number; photoUrl: string | null; categorie: string };
}) {
  const etat = etatCarte(carte.stock);
  return (
    <article
      className={cx("bp-vcard group h-full overflow-hidden", etat.epuisee && "bp-vcard--complet")}
    >
      <div className="bp-vcard__media aspect-[63/88]">
        {carte.photoUrl ? (
          <Image
            src={carte.photoUrl}
            alt={`Carte ${carte.nom}`}
            fill
            sizes="(max-width: 640px) 50vw, 260px"
            className="bp-vcard__photo transition-transform duration-700 group-hover:scale-105"
          />
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
      </div>
      <div className="flex flex-1 flex-col gap-2 px-4 pt-3 pb-4">
        <span className="libelle text-[10px]">{carte.categorie}</span>
        <h3 className="m-0 titre text-lg leading-tight font-semibold">{carte.nom}</h3>
        <span className="mt-auto texte-or titre text-2xl font-bold chiffres">
          {formaterDollars(carte.prix)}
        </span>
      </div>
    </article>
  );
}
