"use client";

import { useState } from "react";
import { actionEnregistrerTextesGroupe } from "@/app/admin/(panel)/parametres/actions";
import { Field, TextArea } from "@/composants/ui/Field";
import type { TextesGroupe } from "@/services/site";
import { SectionParametres, useEnregistrement } from "./Section";

export function FormulaireTextesGroupe({ initial }: { initial: TextesGroupe }) {
  const [textes, setTextes] = useState(initial);
  const { enregistrer, enCours, etat } = useEnregistrement(actionEnregistrerTextesGroupe);
  return (
    <SectionParametres
      id="textes-groupe"
      titre="Accueil du groupe"
      description="Accroche et présentation du groupe. Entourez un passage d’astérisques (*mot*) pour l’accentuer dans un titre. Les variables de Location ({{telephone}}, {{horaires}}, {{toleranceRetardMin}}, {{majorationRetardPourcent}}, {{seuilDefautRestitutionHeures}}, {{forfait:Libellé exact}}) sont disponibles dans les textes."
      onEnregistrer={() => enregistrer(textes)}
      enCours={enCours}
      etat={etat}
    >
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        {(
          [
            ["accroche", "Accroche"],
            ["presentation", "Présentation"],
          ] as const
        ).map(([cle, nom]) => (
          <div key={cle} className="flex flex-col gap-4">
            <Field
              label={`${nom} du groupe · titre`}
              required
              value={textes[cle].titre}
              onChange={(e) =>
                setTextes({ ...textes, [cle]: { ...textes[cle], titre: e.target.value } })
              }
            />
            <TextArea
              label={`${nom} du groupe · texte`}
              rows={5}
              required
              value={textes[cle].texte}
              onChange={(e) =>
                setTextes({ ...textes, [cle]: { ...textes[cle], texte: e.target.value } })
              }
            />
          </div>
        ))}
      </div>
    </SectionParametres>
  );
}
