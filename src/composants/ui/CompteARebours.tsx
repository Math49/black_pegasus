"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formaterTempsRestant } from "@/domaine/encheres";

/** Heure du serveur qui avance chaque seconde (écart avec le navigateur mesuré au montage). */
export function useHeureServeur(maintenant: string): number {
  const serveurMs = new Date(maintenant).getTime();
  const [instant, setInstant] = useState(serveurMs);
  useEffect(() => {
    const ecart = serveurMs - Date.now();
    const minuterie = setInterval(() => setInstant(Date.now() + ecart), 1000);
    return () => clearInterval(minuterie);
  }, [serveurMs]);
  return instant;
}

/**
 * Temps restant d'une enchère, mis à jour chaque seconde : d'abord jusqu'à la fin de la
 * durée choisie (`finDuree`), puis, si l'enchère a été prolongée, le temps additionnel
 * jusqu'à `fin`. L'heure de référence est celle du serveur (`maintenant`) : l'écart avec
 * l'horloge du navigateur est mesuré au montage.
 */
export function CompteARebours({
  fin,
  finDuree,
  maintenant,
  className,
}: {
  /** Fin prévue (ISO 8601), prolongations comprises. */
  fin: string;
  /** Fin de la durée choisie à la création (ISO 8601) ; par défaut `fin`. */
  finDuree?: string;
  /** ISO 8601, heure du serveur au rendu */
  maintenant: string;
  className?: string;
}) {
  const finMs = new Date(fin).getTime();
  const finDureeMs = new Date(finDuree ?? fin).getTime();
  const instant = useHeureServeur(maintenant);
  const additionnel = instant >= finDureeMs && finMs > finDureeMs && instant < finMs;
  const restant = (additionnel ? finMs : Math.min(finDureeMs, finMs)) - instant;
  return (
    <time dateTime={additionnel ? fin : (finDuree ?? fin)} className={className}>
      {additionnel && "Temps additionnel · "}
      {formaterTempsRestant(restant)}
    </time>
  );
}

/** Recharge les données du serveur à intervalle régulier (offres d'une enchère en cours). */
export function Actualisation({ secondes = 15 }: { secondes?: number }) {
  const router = useRouter();
  useEffect(() => {
    const minuterie = setInterval(() => router.refresh(), secondes * 1000);
    return () => clearInterval(minuterie);
  }, [router, secondes]);
  return null;
}
