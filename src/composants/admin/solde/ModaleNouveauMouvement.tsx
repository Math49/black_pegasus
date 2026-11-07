"use client";

import { useState, useTransition } from "react";
import { actionCreerMouvement } from "@/app/admin/(panel)/solde/actions";
import { SEPARATEUR_MILLIERS } from "@/domaine/argent";
import { categoriesDuSens, exigeJustificatif, LIBELLES_CATEGORIE } from "@/domaine/solde";
import {
  CODES_FILIALE,
  filialeImposee,
  filialeParDefaut,
  LIBELLES_FILIALE,
} from "@/domaine/filiales";
import type { CategorieMouvement, CodeFiliale, Sens } from "@/domaine/types";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Field, Select } from "../../ui/Field";
import { Icon } from "../../ui/Icon";
import { Modal } from "../../ui/Modal";
import { DepotJustificatif } from "./DepotJustificatif";

export type ContratLiable = { id: string; numero: string; clientNom: string };

/** « 2400 » → « 2 400 » pendant la saisie (chiffres seulement). */
const grouper = (t: string) =>
  t
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 9)
    .replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR_MILLIERS);

/** Modale « Nouveau mouvement » (maquette 13). */
export function ModaleNouveauMouvement({
  ouvert,
  onFermer,
  onEnregistre,
  semaine,
  dateParDefaut,
  contrats,
  acteur,
}: {
  ouvert: boolean;
  onFermer: () => void;
  onEnregistre: (numero: string) => void;
  semaine: number;
  /** « 2026-10-24T21:40 » à l'heure du serveur */
  dateParDefaut: string;
  contrats: readonly ContratLiable[];
  acteur: { nom: string; avatarUrl: string | null };
}) {
  const [sens, setSens] = useState<Sens>("SORTIE");
  const [categorie, setCategorie] = useState<CategorieMouvement>("ENTRETIEN");
  const [montant, setMontant] = useState("");
  const [motif, setMotif] = useState("");
  const [date, setDate] = useState(dateParDefaut);
  const [contratId, setContratId] = useState("");
  const [filiale, setFiliale] = useState<CodeFiliale | "">(filialeParDefaut("ENTRETIEN") ?? "");
  const [fichier, setFichier] = useState<File | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [erreurJustificatif, setErreurJustificatif] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const exige = exigeJustificatif(sens, categorie);
  // La filiale suit la catégorie : proposée par défaut, verrouillée si la catégorie l'impose.
  const changerCategorie = (c: CategorieMouvement) => {
    setCategorie(c);
    setFiliale(filialeParDefaut(c) ?? "");
  };
  const imposee = filialeImposee(categorie);

  const changerSens = (s: Sens) => {
    setSens(s);
    if (!categoriesDuSens(s).includes(categorie)) changerCategorie(categoriesDuSens(s)[0]);
  };

  const enregistrer = () => {
    setErreur(null);
    setErreurJustificatif(null);
    if (exige && !fichier) {
      setErreurJustificatif("Joignez la capture d’écran : elle est exigée pour une dépense.");
      return;
    }
    const f = new FormData();
    Object.entries({ sens, categorie, montant, motif, date, contratId, filiale }).forEach(
      ([k, v]) => f.set(k, v),
    );
    if (fichier) f.set("justificatif", fichier);
    demarrer(async () => {
      const r = await actionCreerMouvement(f);
      if (!r.ok) return setErreur(r.erreur);
      setMontant("");
      setMotif("");
      setFichier(null);
      setContratId("");
      onEnregistre(r.donnees.numero);
    });
  };

  return (
    <Modal
      ouvert={ouvert}
      onFermer={onFermer}
      surtitre={`Solde · semaine ${semaine}`}
      titre="Nouveau mouvement"
      largeur={640}
      decoupee
      pied={
        <span className="inline-flex items-center gap-2.5 text-[13px] text-texte-doux">
          <Avatar nom={acteur.nom} url={acteur.avatarUrl} taille={28} />
          Saisi par {acteur.nom}
        </span>
      }
      actions={
        <>
          <Button type="button" variante="verre" taille="panel" onClick={onFermer}>
            Annuler
          </Button>
          <Button
            type="submit"
            form="nouveau-mouvement"
            taille="panel"
            icone="valider"
            disabled={enCours}
          >
            Enregistrer le mouvement
          </Button>
        </>
      }
    >
      <form
        id="nouveau-mouvement"
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          enregistrer();
        }}
      >
        <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
          <legend className="bp-label-champ bp-label-champ--panel mb-2 p-0">Sens</legend>
          <div className="flex gap-2.5">
            {(["ENTREE", "SORTIE"] as const).map((s) => (
              <label key={s} className="bp-sg">
                <input
                  type="radio"
                  name="sens"
                  value={s}
                  checked={sens === s}
                  onChange={() => changerSens(s)}
                />
                <Icon
                  nom={s === "ENTREE" ? "entree" : "sortie"}
                  taille={16}
                  className={s === "ENTREE" ? "text-or-icone" : undefined}
                />
                {s === "ENTREE" ? "Entrée" : "Sortie"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div className="flex flex-col gap-2">
            <label htmlFor="mv-montant" className="bp-label-champ bp-label-champ--panel">
              Montant
            </label>
            <span className="relative block">
              <span
                aria-hidden="true"
                className="absolute top-1/2 left-3.5 -translate-y-1/2 font-extrabold text-texte-attenue"
              >
                $
              </span>
              <input
                id="mv-montant"
                required
                inputMode="numeric"
                autoComplete="off"
                className="bp-fld bp-fld--panel pl-[30px] text-base font-extrabold chiffres"
                value={montant}
                onChange={(e) => setMontant(grouper(e.target.value))}
              />
            </span>
          </div>
          <Select
            label="Catégorie"
            value={categorie}
            onChange={(e) => changerCategorie(e.target.value as CategorieMouvement)}
            options={categoriesDuSens(sens).map((c) => ({
              valeur: c,
              libelle: LIBELLES_CATEGORIE[c],
            }))}
          />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_190px] gap-4 max-sm:grid-cols-1">
          <Field
            label="Motif"
            required
            minLength={3}
            maxLength={160}
            value={motif}
            onChange={(e) => setMotif(e.target.value)}
          />
          <Select
            label="Filiale"
            value={filiale}
            disabled={imposee !== null}
            aide={imposee ? "Imposée par la catégorie" : undefined}
            onChange={(e) => setFiliale(e.target.value as CodeFiliale | "")}
            options={[
              { valeur: "", libelle: "Groupe (commun)" },
              ...CODES_FILIALE.map((c) => ({ valeur: c, libelle: LIBELLES_FILIALE[c] })),
            ]}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <Field
            label="Date et heure"
            type="datetime-local"
            required
            value={date}
            max={dateParDefaut}
            onChange={(e) => setDate(e.target.value)}
          />
          <Select
            label={
              <span>
                Contrat lié <span className="font-medium text-texte-attenue">(facultatif)</span>
              </span>
            }
            value={contratId}
            onChange={(e) => setContratId(e.target.value)}
            options={[
              { valeur: "", libelle: "Aucun contrat" },
              ...contrats.map((c) => ({ valeur: c.id, libelle: `${c.numero} · ${c.clientNom}` })),
            ]}
          />
        </div>

        <DepotJustificatif
          fichier={fichier}
          onChange={(f) => {
            setFichier(f);
            setErreurJustificatif(null);
          }}
          exige={exige}
          erreur={erreurJustificatif}
        />

        {erreur && (
          <p role="alert" className="bp-erreur m-0">
            <Icon nom="alerte" taille={14} />
            {erreur}
          </p>
        )}
      </form>
    </Modal>
  );
}
