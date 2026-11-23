"use client";

import { signalEnchere } from "@/domaine/encheres";
import { cx } from "@/lib/classes";
import { Icon } from "../ui/Icon";
import { useHeureServeur } from "../ui/CompteARebours";

const LIBELLES = {
  en_cours: "Enchère",
  fin_proche: "Se termine bientôt",
  terminee: "Enchère terminée",
} as const;

/**
 * Pastille d'une carte aux enchères : « Enchère », puis « Se termine bientôt » dans la
 * dernière heure (pulsation coupée si l'utilisateur réduit les animations), puis « terminée ».
 */
export function PastilleEnchere({
  fin,
  maintenant,
  className,
}: {
  /** Fin prévue (ISO 8601), prolongations comprises. */
  fin: string;
  maintenant: string;
  className?: string;
}) {
  const instant = useHeureServeur(maintenant);
  const signal = signalEnchere(new Date(fin).getTime() - instant);
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
        signal === "terminee"
          ? "border border-[var(--bp-trait-18)] bg-[var(--bp-noir-85)] text-[var(--bp-text-off)]"
          : "bp-pastille-enchere",
        signal === "fin_proche" && "bp-pastille-enchere--fin-proche",
        className,
      )}
    >
      <Icon nom={signal === "fin_proche" ? "horloge" : "marteau"} taille={14} />
      {LIBELLES[signal]}
    </span>
  );
}
