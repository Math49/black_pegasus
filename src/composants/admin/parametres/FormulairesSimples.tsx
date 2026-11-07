"use client";

import { useState } from "react";
import {
  actionEnregistrerAgence,
  actionEnregistrerRegles,
} from "@/app/admin/(panel)/parametres/actions";
import type { ForfaitDegats } from "@/domaine/types";
import { Button, IconButton } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Switch } from "../../ui/Switch";
import { SectionParametres, useEnregistrement } from "./Section";

const nombre = (t: string) => (t.trim() === "" ? Number.NaN : Number(t.replace(/\s/g, "")));

export type Agence = {
  telephone: string;
  horaires: string;
  immatriculation: string;
  fuseau: string;
};

export function FormulaireAgence({ initial }: { initial: Agence }) {
  const [d, setD] = useState(initial);
  const { enregistrer, enCours, etat } = useEnregistrement(actionEnregistrerAgence);
  const champ = (cle: keyof Agence) => ({
    value: d[cle],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setD({ ...d, [cle]: e.target.value }),
  });
  return (
    <SectionParametres
      id="agence"
      titre="Agence"
      description="Contact de Black Pégasus Location (affiché sur le site) et identification du groupe auprès du FISC."
      onEnregistrer={() => enregistrer(d)}
      enCours={enCours}
      etat={etat}
    >
      <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
        <Field label="Téléphone en jeu" required {...champ("telephone")} />
        <Field
          label="Horaires"
          required
          aide="Exemple : 10:00 – 02:00, 7 j / 7"
          {...champ("horaires")}
        />
        <Field
          label="N° d’immatriculation de l’entreprise"
          required
          {...champ("immatriculation")}
        />
        <Field
          label="Fuseau du serveur"
          required
          aide="Identifiant IANA (Europe/Paris…). Il fixe l’heure affichée et les bornes des semaines fiscales."
          {...champ("fuseau")}
        />
      </div>
    </SectionParametres>
  );
}

export type Regles = {
  toleranceRetardMin: number;
  majorationPourcent: number;
  seuilDefautRestitutionHeures: number;
  penalitesSurCaution: boolean;
  forfaits: ForfaitDegats[];
};

export function FormulaireRegles({ initial }: { initial: Regles }) {
  const [tolerance, setTolerance] = useState(String(initial.toleranceRetardMin));
  const [majoration, setMajoration] = useState(String(initial.majorationPourcent));
  const [seuil, setSeuil] = useState(String(initial.seuilDefautRestitutionHeures));
  const [surCaution, setSurCaution] = useState(initial.penalitesSurCaution);
  const [forfaits, setForfaits] = useState(
    initial.forfaits.map((f, i) => ({
      cle: `f${i}`,
      libelle: f.libelle,
      montant: String(f.montant),
    })),
  );
  const { enregistrer, enCours, etat } = useEnregistrement(actionEnregistrerRegles);

  return (
    <SectionParametres
      id="regles"
      titre="Règles de location"
      description="Appliquées aux clôtures de contrats et citées dans le règlement public."
      onEnregistrer={() =>
        enregistrer({
          toleranceRetardMin: nombre(tolerance),
          majorationPourcent: nombre(majoration),
          seuilDefautRestitutionHeures: nombre(seuil),
          penalitesSurCaution: surCaution,
          forfaits: forfaits.map((f) => ({ libelle: f.libelle, montant: nombre(f.montant) })),
        })
      }
      enCours={enCours}
      etat={etat}
    >
      <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
        <Field
          label="Tolérance de retard (min)"
          inputMode="numeric"
          required
          value={tolerance}
          onChange={(e) => setTolerance(e.target.value)}
        />
        <Field
          label="Majoration du tarif horaire (%)"
          inputMode="numeric"
          required
          value={majoration}
          onChange={(e) => setMajoration(e.target.value)}
        />
        <Field
          label="Défaut de restitution (h)"
          inputMode="numeric"
          required
          aide="Au-delà, le retard est signalé au gérant."
          value={seuil}
          onChange={(e) => setSeuil(e.target.value)}
        />
      </div>
      <Switch
        label="Retenir les pénalités sur la caution (sinon, elles sont réglées à part)"
        coche={surCaution}
        onChange={setSurCaution}
      />

      <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
        <legend className="bp-label-champ bp-label-champ--panel mb-2 p-0">
          Forfaits de dégâts
        </legend>
        {forfaits.map((f, i) => (
          <div
            key={f.cle}
            className="grid grid-cols-[minmax(0,1fr)_150px_44px] items-end gap-3 max-sm:grid-cols-[minmax(0,1fr)_110px_44px]"
          >
            <Field
              label={`Libellé du forfait ${i + 1}`}
              value={f.libelle}
              required
              onChange={(e) =>
                setForfaits(
                  forfaits.map((x) => (x.cle === f.cle ? { ...x, libelle: e.target.value } : x)),
                )
              }
            />
            <Field
              label="Montant ($)"
              inputMode="numeric"
              required
              value={f.montant}
              onChange={(e) =>
                setForfaits(
                  forfaits.map((x) => (x.cle === f.cle ? { ...x, montant: e.target.value } : x)),
                )
              }
            />
            <IconButton
              libelle={`Supprimer le forfait ${f.libelle || i + 1}`}
              icone="corbeille"
              variante="danger"
              onClick={() => setForfaits(forfaits.filter((x) => x.cle !== f.cle))}
            />
          </div>
        ))}
        <Button
          type="button"
          variante="verre"
          taille="panel-petit"
          icone="plus"
          className="self-start"
          onClick={() =>
            setForfaits([...forfaits, { cle: `n${Date.now()}`, libelle: "", montant: "" }])
          }
        >
          Ajouter un forfait
        </Button>
      </fieldset>
    </SectionParametres>
  );
}
