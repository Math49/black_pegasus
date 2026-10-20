import type { ReactNode } from "react";
import { cx } from "@/lib/classes";
import { CadreIcone } from "../ui/Chip";
import { GlassCard } from "../ui/GlassCard";
import type { NomIcone } from "../ui/Icon";

/** Bloc carré de la fiche véhicule (places, contenance, catégorie, exemplaires). */
export function CarteInfo({
  icone,
  valeur,
  libelle,
  className,
}: {
  icone: NomIcone;
  valeur: ReactNode;
  libelle: string;
  className?: string;
}) {
  return (
    <GlassCard
      variante="site"
      className={cx("flex aspect-square flex-col justify-between rounded-[22px] p-5", className)}
    >
      <CadreIcone icone={icone} taille={44} />
      <span className="flex flex-col gap-1.5">
        <span className="text-[40px] leading-none font-extrabold chiffres">{valeur}</span>
        <span className="libelle">{libelle}</span>
      </span>
    </GlassCard>
  );
}

/** Rappel « Réservez par téléphone en jeu » : numéro et horaires viennent de Parametres. */
export function CarteTelephone({
  telephone,
  horaires,
  className,
}: {
  telephone: string;
  horaires: string;
  className?: string;
}) {
  return (
    <GlassCard
      variante="site"
      className={cx("flex flex-col gap-2.5 bg-[var(--bp-surface-55)] px-5 py-[18px]", className)}
    >
      <span className="libelle">Réservez par téléphone en jeu</span>
      {/* Numéro en jeu : pas de lien tel:, il ouvrirait le vrai téléphone du visiteur. */}
      <span className="w-fit texte-or text-[28px] font-extrabold chiffres">{telephone}</span>
      <span className="text-[13px] text-texte-doux">{horaires}</span>
    </GlassCard>
  );
}
