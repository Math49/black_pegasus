"use client";

import { useState } from "react";
import { cx } from "@/lib/classes";
import type { TailleBouton, VarianteBouton } from "../ui/Button";
import { Icon } from "../ui/Icon";

/**
 * « Appeler le 555-XXXX » : le numéro se compose en jeu, pas sur un vrai téléphone.
 * Le bouton copie donc le numéro dans le presse-papiers et le confirme.
 */
export function BoutonAppeler({
  telephone,
  libelle = `Appeler le ${telephone}`,
  variante = "or",
  taille = "site",
  className,
}: {
  telephone: string;
  libelle?: string;
  variante?: VarianteBouton;
  taille?: TailleBouton;
  className?: string;
}) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(telephone);
      setCopie(true);
      setTimeout(() => setCopie(false), 2500);
    } catch {
      // Presse-papiers indisponible : le numéro reste affiché sur le bouton.
    }
  };

  return (
    <button
      type="button"
      onClick={copier}
      title={`Copier le ${telephone} à composer en jeu`}
      className={cx("bp-btn", `bp-btn--${variante}`, `bp-btn--${taille}`, className)}
    >
      <Icon nom={copie ? "valider" : "telephone"} taille={taille.startsWith("site") ? 20 : 18} />
      <span aria-live="polite">{copie ? "Numéro copié" : libelle}</span>
    </button>
  );
}
