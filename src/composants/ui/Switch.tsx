"use client";

import { useState, type ReactNode } from "react";
import { cx } from "@/lib/classes";

/**
 * Interrupteur (`role="switch"`). Or sur le site, argent dans le panel.
 * Contrôlé (`coche` + `onChange`) ou autonome (`cocheParDefaut`). Avec `name`, la valeur
 * « on » est envoyée dans les formulaires quand il est activé.
 */
export function Switch({
  label,
  libelleAccessible,
  coche,
  cocheParDefaut = false,
  onChange,
  variante = "panel",
  name,
  disabled,
  className,
}: {
  /** Texte visible à droite de l'interrupteur. */
  label?: ReactNode;
  /** Nom accessible quand il n'y a pas de texte visible. */
  libelleAccessible?: string;
  coche?: boolean;
  cocheParDefaut?: boolean;
  onChange?: (coche: boolean) => void;
  variante?: "site" | "panel";
  name?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [interne, setInterne] = useState(cocheParDefaut);
  const actif = coche ?? interne;

  const basculer = () => {
    if (coche === undefined) setInterne(!actif);
    onChange?.(!actif);
  };

  const bouton = (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={label ? undefined : libelleAccessible}
      disabled={disabled}
      onClick={basculer}
      className={cx("bp-switch", `bp-switch--${variante}`, variante === "panel" && "bp-cible")}
    >
      <span className="bp-switch__bouton" aria-hidden="true" />
    </button>
  );

  return (
    <span className={cx("inline-flex items-center gap-3 text-sm", className)}>
      {label ? (
        <label className="inline-flex cursor-pointer items-center gap-3">
          {bouton}
          {label}
        </label>
      ) : (
        bouton
      )}
      {name && actif && <input type="hidden" name={name} value="on" />}
    </span>
  );
}
