"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { actionEnregistrerFiliale } from "@/app/admin/(panel)/parametres/actions";
import type { CodeFiliale } from "@/domaine/types";
import { libelleFiliale } from "@/domaine/filiales";
import { Field } from "@/composants/ui/Field";
import { Switch } from "@/composants/ui/Switch";
import { SectionParametres, useEnregistrement } from "./Section";

type Filiale = {
  code: CodeFiliale;
  nom: string;
  accroche: string;
  telephone: string;
  horaires: string;
  ordre: number;
  visible: boolean;
  logo: string;
};

export function FormulaireFiliale({ initial }: { initial: Filiale }) {
  const [d, setD] = useState(initial);
  const fichier = useRef<HTMLInputElement>(null);
  const { enregistrer, enCours, etat } = useEnregistrement(actionEnregistrerFiliale);
  const champ = (cle: "nom" | "accroche" | "telephone" | "horaires") => ({
    value: d[cle],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [cle]: e.target.value }),
  });
  return (
    <SectionParametres
      id={`filiale-${initial.code}`}
      titre={`Filiale · ${libelleFiliale(initial.code)}`}
      description="Identité, coordonnées et visibilité sur le site public. Une filiale masquée n’est plus accessible sur le site."
      enCours={enCours}
      etat={etat}
      onEnregistrer={() => {
        const formulaire = new FormData();
        for (const cle of ["code", "nom", "accroche", "telephone", "horaires", "ordre"] as const)
          formulaire.set(cle, String(d[cle]));
        formulaire.set("visible", d.visible ? "1" : "0");
        const image = fichier.current?.files?.[0];
        if (image) formulaire.set("logo", image);
        enregistrer(formulaire);
      }}
    >
      <div className="flex flex-wrap items-center gap-5">
        <Image
          src={initial.logo}
          alt={`Logo ${initial.nom}`}
          width={88}
          height={88}
          className="rounded-full bg-noir object-contain"
        />
        <Field
          label="Logo de la filiale"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          ref={fichier}
          aide="PNG, JPG ou WEBP, 10 Mo maximum. Sans fichier, le logo actuel est conservé."
        />
      </div>
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Field label="Nom de la filiale" required maxLength={100} {...champ("nom")} />
        <Field label="Accroche" required maxLength={300} {...champ("accroche")} />
        <Field label="Téléphone en jeu" required maxLength={100} {...champ("telephone")} />
        <Field label="Horaires" required maxLength={80} {...champ("horaires")} />
        <Field
          label="Ordre d’affichage"
          type="number"
          min={0}
          max={1000}
          required
          value={d.ordre}
          onChange={(e) => setD({ ...d, ordre: Number(e.target.value) })}
        />
      </div>
      <Switch
        label="Visible sur le site"
        coche={d.visible}
        onChange={(visible) => setD({ ...d, visible })}
      />
    </SectionParametres>
  );
}
