"use client";

import { useState } from "react";
import {
  actionAjouterCategorie,
  actionDeplacerCategorie,
  actionRenommerCategorie,
  actionSupprimerCategorie,
} from "@/app/admin/(panel)/parametres/actions";
import type { TypeVehicule } from "@/domaine/types";
import { libelleType } from "@/domaine/unites";
import { Button, IconButton } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { SectionParametres, useEnregistrement } from "./Section";

export type CategorieAdmin = { id: string; type: TypeVehicule; nom: string; vehicules: number };

const TYPES: TypeVehicule[] = ["BATEAU", "AVION", "HELICOPTERE"];

type Operation =
  | { op: "ajouter"; type: TypeVehicule; nom: string }
  | { op: "renommer"; id: string; nom: string }
  | { op: "deplacer"; id: string; delta: -1 | 1 }
  | { op: "supprimer"; id: string };

const executerOperation = (o: Operation) =>
  o.op === "ajouter"
    ? actionAjouterCategorie(o.type, o.nom)
    : o.op === "renommer"
      ? actionRenommerCategorie(o.id, o.nom)
      : o.op === "deplacer"
        ? actionDeplacerCategorie(o.id, o.delta)
        : actionSupprimerCategorie(o.id);

/** Catégories par type de véhicule : ajout, renommage, ordre, suppression si inutilisée. */
export function GestionCategories({ categories }: { categories: CategorieAdmin[] }) {
  const [noms, setNoms] = useState<Record<string, string>>({});
  const [nouvelles, setNouvelles] = useState<Record<string, string>>({});
  const { enregistrer, enCours, etat } = useEnregistrement(executerOperation);

  return (
    <SectionParametres
      id="categories"
      titre="Catégories"
      description="Classent la flotte sur le site (filtres et fiches). Chaque modification est enregistrée aussitôt ; une catégorie utilisée par un véhicule ne peut pas être supprimée."
      etat={etat}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-4">
        {TYPES.map((type) => {
          const liste = categories.filter((c) => c.type === type);
          return (
            <fieldset
              key={type}
              className="m-0 flex flex-col gap-2.5 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] p-4"
            >
              <legend className="px-1 titre text-[15px] font-semibold">
                {libelleType(type, true)}
              </legend>
              <ul className="m-0 flex list-none flex-col gap-2 p-0">
                {liste.map((c, i) => {
                  const nom = noms[c.id] ?? c.nom;
                  return (
                    <li key={c.id} className="flex flex-col gap-1">
                      <form
                        className="flex items-center gap-1.5"
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (nom.trim() !== c.nom)
                            enregistrer(
                              { op: "renommer", id: c.id, nom },
                              `Catégorie renommée en « ${nom.trim()} ».`,
                            );
                        }}
                      >
                        <label className="sr-only" htmlFor={`cat-${c.id}`}>
                          Nom de la catégorie {c.nom}
                        </label>
                        <input
                          id={`cat-${c.id}`}
                          className="bp-fld bp-fld--panel min-w-0 flex-1"
                          value={nom}
                          onChange={(e) => setNoms({ ...noms, [c.id]: e.target.value })}
                        />
                        {nom.trim() !== c.nom && (
                          <IconButton
                            type="submit"
                            libelle={`Enregistrer le nom de ${c.nom}`}
                            icone="valider"
                            variante="or"
                            disabled={enCours}
                          />
                        )}
                        <IconButton
                          libelle={`Monter ${c.nom}`}
                          icone="chevronGauche"
                          className="rotate-90"
                          disabled={i === 0 || enCours}
                          onClick={() =>
                            enregistrer(
                              { op: "deplacer", id: c.id, delta: -1 },
                              "Ordre enregistré.",
                            )
                          }
                        />
                        <IconButton
                          libelle={`Descendre ${c.nom}`}
                          icone="chevronDroite"
                          className="rotate-90"
                          disabled={i === liste.length - 1 || enCours}
                          onClick={() =>
                            enregistrer({ op: "deplacer", id: c.id, delta: 1 }, "Ordre enregistré.")
                          }
                        />
                        <IconButton
                          libelle={
                            c.vehicules > 0
                              ? `${c.nom} est utilisée par ${c.vehicules} véhicule${c.vehicules > 1 ? "s" : ""} : suppression impossible`
                              : `Supprimer ${c.nom}`
                          }
                          icone="corbeille"
                          variante="danger"
                          disabled={c.vehicules > 0 || enCours}
                          onClick={() =>
                            enregistrer(
                              { op: "supprimer", id: c.id },
                              `Catégorie « ${c.nom} » supprimée.`,
                            )
                          }
                        />
                      </form>
                      <span className="pl-1 text-xs text-texte-attenue">
                        {c.vehicules === 0
                          ? "Aucun véhicule"
                          : `${c.vehicules} véhicule${c.vehicules > 1 ? "s" : ""}`}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <form
                className="flex items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const nom = nouvelles[type] ?? "";
                  enregistrer({ op: "ajouter", type, nom }, `Catégorie « ${nom.trim()} » ajoutée.`);
                  setNouvelles({ ...nouvelles, [type]: "" });
                }}
              >
                <Field
                  label={`Nouvelle catégorie · ${libelleType(type, true).toLowerCase()}`}
                  className="min-w-0 flex-1"
                  value={nouvelles[type] ?? ""}
                  onChange={(e) => setNouvelles({ ...nouvelles, [type]: e.target.value })}
                />
                <Button
                  type="submit"
                  variante="verre"
                  taille="panel"
                  icone="plus"
                  disabled={enCours || !(nouvelles[type] ?? "").trim()}
                >
                  Ajouter
                </Button>
              </form>
            </fieldset>
          );
        })}
      </div>
    </SectionParametres>
  );
}
