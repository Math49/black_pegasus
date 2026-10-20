"use client";

import { useState, useTransition } from "react";
import { actionChangerVisibilite } from "@/app/admin/(panel)/vehicules/actions";
import { Switch } from "../../ui/Switch";

/** Interrupteur « Sur le site » de la liste des véhicules (action immédiate). */
export function InterrupteurVisibilite({
  id,
  nom,
  visible,
}: {
  id: string;
  nom: string;
  visible: boolean;
}) {
  const [valeur, setValeur] = useState(visible);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  return (
    <span className="flex items-center gap-2">
      <Switch
        libelleAccessible={`Afficher ${nom} sur le site`}
        coche={valeur}
        disabled={enCours}
        onChange={(v) =>
          demarrer(async () => {
            setValeur(v);
            setErreur(null);
            const r = await actionChangerVisibilite(id, v);
            if (!r.ok) {
              setValeur(!v);
              setErreur(r.erreur);
            }
          })
        }
      />
      <span className="text-[12.5px] text-texte-doux">{valeur ? "Oui" : "Non"}</span>
      {erreur && (
        <span role="alert" className="sr-only">
          {erreur}
        </span>
      )}
    </span>
  );
}
