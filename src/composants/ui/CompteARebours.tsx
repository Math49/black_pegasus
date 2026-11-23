"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formaterTempsRestant } from "@/domaine/encheres";

/**
 * Temps restant jusqu'à `fin`, mis à jour chaque seconde. L'heure de référence est celle du
 * serveur (`maintenant`) : l'écart avec l'horloge du navigateur est mesuré au montage.
 */
export function CompteARebours({
  fin,
  maintenant,
  className,
}: {
  /** ISO 8601 */
  fin: string;
  /** ISO 8601, heure du serveur au rendu */
  maintenant: string;
  className?: string;
}) {
  const finMs = new Date(fin).getTime();
  const serveurMs = new Date(maintenant).getTime();
  const [restant, setRestant] = useState(finMs - serveurMs);
  useEffect(() => {
    const ecart = serveurMs - Date.now();
    const tic = () => setRestant(finMs - (Date.now() + ecart));
    const minuterie = setInterval(tic, 1000);
    return () => clearInterval(minuterie);
  }, [finMs, serveurMs]);
  return (
    <time dateTime={fin} className={className}>
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
