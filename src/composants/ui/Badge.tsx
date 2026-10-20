import type { Disponibilite } from "@/domaine/disponibilite";
import { cx } from "@/lib/classes";

/**
 * Badge de disponibilité du site : or si au moins un exemplaire est libre, argent atténué
 * si « Complet ». Le libellé vient de `domaine/disponibilite.ts`.
 */
export function Badge({
  disponibilite,
  className,
}: {
  disponibilite: Disponibilite;
  className?: string;
}) {
  const libre = disponibilite.libres > 0;
  return (
    <span className={cx("bp-badge", libre ? "bp-badge--dispo" : "bp-badge--complet", className)}>
      <span className="bp-point" aria-hidden="true" />
      {disponibilite.libelle}
    </span>
  );
}
