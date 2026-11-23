"use client";

import { useState } from "react";
import {
  actionArchiverCategorieMouvement,
  actionEnregistrerCategorieMouvement,
  actionEnregistrerTauxImpot,
  actionSupprimerCategorieMouvement,
} from "@/app/admin/(panel)/parametres/actions";
import { LIBELLES_SENS_CATEGORIE } from "@/domaine/categories";
import { CODES_FILIALE, LIBELLES_FILIALE } from "@/domaine/filiales";
import type { CodeFiliale, SensCategorie } from "@/domaine/types";
import { cx } from "@/lib/classes";
import { Button, IconButton } from "../../ui/Button";
import { Field, Select } from "../../ui/Field";
import { Switch } from "../../ui/Switch";
import { SectionParametres, useEnregistrement } from "./Section";

/** Taux de l'impôt hebdomadaire, en pourcentage des recettes. */
export function FormulaireImpot({ initial }: { initial: number }) {
  const [taux, setTaux] = useState(String(initial));
  const { enregistrer, enCours, etat } = useEnregistrement(actionEnregistrerTauxImpot);
  return (
    <SectionParametres
      id="impot"
      titre="Impôt hebdomadaire"
      description="L’impôt dû se calcule sur le total des recettes de la semaine. Le nouveau taux s’applique à la semaine ouverte ; une semaine clôturée garde le sien."
      onEnregistrer={() =>
        enregistrer({ tauxImpot: taux.trim() === "" ? Number.NaN : Number(taux) })
      }
      enCours={enCours}
      etat={etat}
    >
      <Field
        label="Taux d’impôt (% des recettes)"
        inputMode="numeric"
        className="max-w-[260px]"
        value={taux}
        onChange={(e) => setTaux(e.target.value.replace(/\D/g, "").slice(0, 3))}
      />
    </SectionParametres>
  );
}

export type CategorieMouvementAdmin = {
  id: string;
  nom: string;
  sens: SensCategorie;
  filiale: CodeFiliale | null;
  justificatifObligatoire: boolean;
  systeme: boolean;
  archivee: boolean;
  mouvements: number;
};

type Saisie = Pick<CategorieMouvementAdmin, "nom" | "sens" | "filiale" | "justificatifObligatoire">;

type Operation =
  | { op: "enregistrer"; id: string | null; saisie: Saisie }
  | { op: "archiver"; id: string; archivee: boolean }
  | { op: "supprimer"; id: string };

const executerOperation = (o: Operation) =>
  o.op === "enregistrer"
    ? actionEnregistrerCategorieMouvement({ id: o.id, ...o.saisie })
    : o.op === "archiver"
      ? actionArchiverCategorieMouvement(o.id, o.archivee)
      : actionSupprimerCategorieMouvement(o.id);

const OPTIONS_SENS = (["ENTREE", "SORTIE", "LES_DEUX"] as const).map((s) => ({
  valeur: s,
  libelle: LIBELLES_SENS_CATEGORIE[s],
}));
const OPTIONS_FILIALE = [
  { valeur: "", libelle: "Groupe (commun)" },
  ...CODES_FILIALE.map((c) => ({ valeur: c, libelle: LIBELLES_FILIALE[c] })),
];

const VIDE: Saisie = { nom: "", sens: "SORTIE", filiale: null, justificatifObligatoire: true };
const pareil = (a: Saisie, b: Saisie) =>
  a.nom.trim() === b.nom &&
  a.sens === b.sens &&
  a.filiale === b.filiale &&
  a.justificatifObligatoire === b.justificatifObligatoire;

/** Champs d'une catégorie (ligne existante ou nouvelle). */
function Champs({
  id,
  saisie,
  onChange,
  verrouille,
}: {
  id: string;
  saisie: Saisie;
  onChange: (s: Saisie) => void;
  /** Catégorie système : seul le nom se modifie. */
  verrouille: boolean;
}) {
  return (
    <>
      <Field
        label="Nom"
        id={`nom-${id}`}
        className="min-w-0"
        value={saisie.nom}
        onChange={(e) => onChange({ ...saisie, nom: e.target.value })}
      />
      <Select
        label="Sens"
        value={saisie.sens}
        disabled={verrouille}
        options={OPTIONS_SENS}
        onChange={(e) => onChange({ ...saisie, sens: e.target.value as SensCategorie })}
      />
      <Select
        label="Filiale proposée"
        value={saisie.filiale ?? ""}
        disabled={verrouille}
        options={OPTIONS_FILIALE}
        onChange={(e) =>
          onChange({ ...saisie, filiale: (e.target.value || null) as CodeFiliale | null })
        }
      />
      <div className="flex min-h-11 items-center self-end pb-1">
        <Switch
          label="Justificatif obligatoire"
          coche={saisie.justificatifObligatoire}
          disabled={verrouille || saisie.sens === "ENTREE"}
          onChange={(v) => onChange({ ...saisie, justificatifObligatoire: v })}
        />
      </div>
    </>
  );
}

/** Catégories de mouvements : création, modification, archivage, suppression si inutilisée. */
export function GestionCategoriesMouvement({
  categories,
}: {
  categories: CategorieMouvementAdmin[];
}) {
  const [saisies, setSaisies] = useState<Record<string, Saisie>>({});
  const [nouvelle, setNouvelle] = useState<Saisie>(VIDE);
  const { enregistrer, enCours, etat } = useEnregistrement(executerOperation);
  const grille =
    "grid grid-cols-[minmax(180px,1.4fr)_minmax(150px,1fr)_minmax(150px,1fr)_auto] items-start gap-3";

  return (
    <SectionParametres
      id="categories-mouvements"
      titre="Catégories de mouvements"
      description="Proposées à la saisie d’un mouvement. Une entrée compte toujours comme recette et une sortie comme dépense, sauf les cautions. Les catégories système se renomment seulement ; une catégorie déjà utilisée s’archive au lieu d’être supprimée."
      etat={etat}
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {categories.map((c) => {
          const s = saisies[c.id] ?? c;
          const modifiee = !pareil(s, c);
          return (
            <li
              key={c.id}
              className={cx(
                "flex flex-col gap-2.5 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] p-4",
                c.archivee && "opacity-70",
              )}
            >
              <form
                aria-label={`Catégorie ${c.nom}`}
                className={grille}
                onSubmit={(e) => {
                  e.preventDefault();
                  enregistrer(
                    { op: "enregistrer", id: c.id, saisie: s },
                    `Catégorie « ${s.nom.trim()} » enregistrée.`,
                  );
                }}
              >
                <Champs
                  id={c.id}
                  saisie={s}
                  verrouille={c.systeme}
                  onChange={(v) => setSaisies({ ...saisies, [c.id]: v })}
                />
                {modifiee && (
                  <div className="col-span-full flex justify-end">
                    <Button type="submit" taille="panel-petit" icone="valider" disabled={enCours}>
                      Enregistrer
                    </Button>
                  </div>
                )}
              </form>
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-texte-attenue">
                <span>
                  {c.systeme && <span className="bp-tag mr-2">Système</span>}
                  {c.archivee && <span className="bp-tag mr-2">Archivée</span>}
                  {c.mouvements === 0
                    ? "Aucun mouvement"
                    : `${c.mouvements} mouvement${c.mouvements > 1 ? "s" : ""}`}
                </span>
                {!c.systeme && (
                  <span className="flex gap-2">
                    <Button
                      variante="verre"
                      taille="panel-petit"
                      disabled={enCours}
                      onClick={() =>
                        enregistrer(
                          { op: "archiver", id: c.id, archivee: !c.archivee },
                          c.archivee
                            ? `Catégorie « ${c.nom} » de nouveau proposée.`
                            : `Catégorie « ${c.nom} » archivée.`,
                        )
                      }
                    >
                      {c.archivee ? "Restaurer" : "Archiver"}
                    </Button>
                    <IconButton
                      libelle={
                        c.mouvements > 0
                          ? `${c.nom} est utilisée : archivez-la plutôt que de la supprimer`
                          : `Supprimer ${c.nom}`
                      }
                      icone="corbeille"
                      variante="danger"
                      disabled={c.mouvements > 0 || enCours}
                      onClick={() =>
                        enregistrer(
                          { op: "supprimer", id: c.id },
                          `Catégorie « ${c.nom} » supprimée.`,
                        )
                      }
                    />
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form
        aria-label="Nouvelle catégorie de mouvement"
        className="mt-2 flex flex-col gap-3 rounded-[14px] border border-dashed border-[var(--bp-trait-18)] p-4"
        onSubmit={(e) => {
          e.preventDefault();
          enregistrer(
            { op: "enregistrer", id: null, saisie: nouvelle },
            `Catégorie « ${nouvelle.nom.trim()} » créée.`,
          );
          setNouvelle(VIDE);
        }}
      >
        <span className="titre text-[15px] font-semibold">Nouvelle catégorie</span>
        <div className={grille}>
          <Champs id="nouvelle" saisie={nouvelle} verrouille={false} onChange={setNouvelle} />
        </div>
        <Button
          type="submit"
          variante="verre"
          taille="panel"
          icone="plus"
          className="self-end"
          disabled={enCours || nouvelle.nom.trim().length < 2}
        >
          Créer la catégorie
        </Button>
      </form>
    </SectionParametres>
  );
}
