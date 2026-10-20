import type { ReactNode } from "react";
import { cx } from "@/lib/classes";
import { Icon, type NomIcone } from "./Icon";

export type TonStatut = "ok" | "attenue" | "or" | "alerte";

/**
 * Statut du panel (pilule 24 px). Le ton « alerte » porte toujours une icône en plus du texte :
 * l'état ne repose jamais sur la seule couleur.
 */
export function Statut({
  ton = "attenue",
  icone,
  point = false,
  children,
  className,
}: {
  ton?: TonStatut;
  icone?: NomIcone;
  point?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const nomIcone = icone ?? (ton === "alerte" ? "alerte" : undefined);
  return (
    <span className={cx("bp-st", `bp-st--${ton}`, className)}>
      {nomIcone ? (
        <Icon nom={nomIcone} taille={13} />
      ) : (
        point && <span className="bp-point" aria-hidden="true" />
      )}
      {children}
    </span>
  );
}
