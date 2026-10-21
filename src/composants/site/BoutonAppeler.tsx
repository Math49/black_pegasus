"use client";

import { useState } from "react";
import { numerosTelephone } from "@/domaine/textes";
import { cx } from "@/lib/classes";
import type { TailleBouton, VarianteBouton } from "../ui/Button";
import { Icon } from "../ui/Icon";

/**
 * « Appeler le 555-XXXX » : le numéro se compose en jeu, pas sur un vrai téléphone.
 * Le bouton copie donc le numéro dans le presse-papiers et le confirme. Avec plusieurs
 * numéros (« 205-3953 / 602-5376 »), un bouton par numéro, qui passent à la ligne au besoin.
 */
export function BoutonAppeler({
  telephone,
  libelle,
  variante = "or",
  taille = "site",
  className,
}: {
  telephone: string;
  /** Texte du bouton, « {numero} » remplacé par chaque numéro (défaut : « Appeler le … »). */
  libelle?: string;
  variante?: VarianteBouton;
  taille?: TailleBouton;
  className?: string;
}) {
  const numeros = numerosTelephone(telephone);
  const texte = (n: string) => (libelle ?? "Appeler le {numero}").replaceAll("{numero}", n);
  if (numeros.length === 1)
    return (
      <BoutonNumero
        {...{ numero: numeros[0], texte: texte(numeros[0]), variante, taille, className }}
      />
    );
  return (
    // « contents » : chaque bouton s'insère dans la mise en page du parent, comme un seul.
    <span className="contents">
      {numeros.map((n) => (
        <BoutonNumero key={n} {...{ numero: n, texte: texte(n), variante, taille, className }} />
      ))}
    </span>
  );
}

function BoutonNumero({
  numero,
  texte,
  variante,
  taille,
  className,
}: {
  numero: string;
  texte: string;
  variante: VarianteBouton;
  taille: TailleBouton;
  className?: string;
}) {
  const [copie, setCopie] = useState(false);

  const copier = async () => {
    try {
      await navigator.clipboard.writeText(numero);
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
      title={`Copier le ${numero} à composer en jeu`}
      className={cx("bp-btn", `bp-btn--${variante}`, `bp-btn--${taille}`, className)}
    >
      <Icon nom={copie ? "valider" : "telephone"} taille={taille.startsWith("site") ? 20 : 18} />
      <span aria-live="polite">{copie ? "Numéro copié" : texte}</span>
    </button>
  );
}
