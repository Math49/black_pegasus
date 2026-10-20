import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type NomIcone } from "./Icon";

/** Élément de la barre latérale du panel, avec compteur facultatif. */
export function NavItem({
  href,
  icone,
  children,
  actif = false,
  compteur,
  compteurAlerte = false,
}: {
  href: string;
  icone: NomIcone;
  children: ReactNode;
  actif?: boolean;
  compteur?: ReactNode;
  /** Compteur d'alerte (retards) : teinte alerte + icône. */
  compteurAlerte?: boolean;
}) {
  return (
    <Link href={href} className="bp-nv" aria-current={actif ? "page" : undefined}>
      <Icon nom={icone} taille={18} />
      {children}
      {compteur !== undefined && (
        <span className={compteurAlerte ? "bp-cnt bp-cnt--alerte" : "bp-cnt"}>
          {compteurAlerte && <Icon nom="alerte" taille={11} trait={2} />}
          {compteur}
        </span>
      )}
    </Link>
  );
}
