import type { ReactNode } from "react";
import { cx } from "@/lib/classes";
import { Icon, type NomIcone } from "./Icon";

/** Pastille du site (places, contenance, catégorie) : 30 px. */
export function Chip({
  icone,
  children,
  className,
}: {
  icone?: NomIcone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("bp-chip", className)}>
      {icone && <Icon nom={icone} taille={15} />}
      {children}
    </span>
  );
}

/** Étiquette du panel (catégorie dans les tableaux) : 24 px. */
export function Tag({
  icone,
  children,
  className,
}: {
  icone?: NomIcone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cx("bp-tag", className)}>
      {icone && <Icon nom={icone} taille={13} />}
      {children}
    </span>
  );
}

/** Icône décorative dans un cadre carré doré (48 px). */
export function CadreIcone({
  icone,
  taille = 48,
  className,
}: {
  icone: NomIcone;
  taille?: number;
  className?: string;
}) {
  return (
    <span
      className={cx("bp-cadre-icone", className)}
      style={{ width: taille, height: taille }}
      aria-hidden="true"
    >
      <Icon nom={icone} trait={1.5} />
    </span>
  );
}
