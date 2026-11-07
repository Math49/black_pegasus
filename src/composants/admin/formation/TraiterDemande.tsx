"use client";

import { actionTraiterDemande } from "@/app/admin/(panel)/formation/actions";
import { Button } from "@/composants/ui/Button";
import { MessageEtat, useEnregistrement } from "@/composants/admin/parametres/Section";

export function TraiterDemande({ id, nomRp }: { id: string; nomRp: string }) {
  const { enregistrer, enCours, etat } = useEnregistrement(actionTraiterDemande);
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        taille="panel"
        variante="verre"
        icone="valider"
        aria-label={`Marquer traitée la demande de ${nomRp}`}
        disabled={enCours}
        onClick={() => enregistrer(id)}
      >
        Marquer traitée
      </Button>
      <MessageEtat etat={etat} />
    </div>
  );
}
