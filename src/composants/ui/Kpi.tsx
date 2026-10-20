import type { ReactNode } from "react";
import { cx } from "@/lib/classes";
import { GlassCard } from "./GlassCard";
import { Icon, type NomIcone } from "./Icon";

/** Indicateur clé : libellé, grand chiffre, ligne de contexte. */
export function Kpi({
  libelle,
  valeur,
  icone,
  iconeOr = false,
  valeurOr = false,
  contexte,
  className,
}: {
  libelle: string;
  /** Valeur déjà formatée (formaterDollars…). */
  valeur: ReactNode;
  icone?: NomIcone;
  iconeOr?: boolean;
  /** Or réservé aux chiffres clés (solde, résultat imposable). */
  valeurOr?: boolean;
  contexte?: ReactNode;
  className?: string;
}) {
  return (
    <GlassCard variante="admin" className={cx("bp-kpi", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="libelle text-[10.5px] tracking-[0.2em]">{libelle}</span>
        {icone && <Icon nom={icone} className={iconeOr ? "text-or-icone" : "text-argent-1"} />}
      </div>
      <span className={cx("bp-kpi__valeur", valeurOr && "texte-or")}>{valeur}</span>
      {contexte && <div className="bp-kpi__contexte">{contexte}</div>}
    </GlassCard>
  );
}
