"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actionCloturerSemaine } from "@/app/admin/(panel)/comptabilite/actions";
import { confirmationClotureValide, texteConfirmationCloture } from "@/domaine/comptabilite";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { Modal } from "../../ui/Modal";

/** Bouton « Clôturer la semaine » et sa confirmation textuelle (maquette 20). */
export function ModaleCloture({
  semaineId,
  numero,
  periode,
  resume,
  avertissement,
  desactive,
  raison,
}: {
  semaineId: string;
  numero: number;
  /** « du lundi 19 au dimanche 25 octobre » */
  periode: string;
  resume: {
    operations: number;
    recettes: string;
    depenses: string;
    cautions: string;
    resultat: string;
  };
  /** Contrats en cours : leurs cautions restent détenues. */
  avertissement: React.ReactNode | null;
  desactive: boolean;
  /** Contrôle bloquant affiché quand la clôture n'est pas encore possible. */
  raison: string | null;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  const attendu = texteConfirmationCloture(numero);
  const valide = confirmationClotureValide(saisie, numero);

  const cloturer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionCloturerSemaine({ semaineId, confirmation: saisie });
      if (!r.ok) return setErreur(r.erreur);
      setOuvert(false);
      router.refresh();
    });

  return (
    <>
      <Button
        type="button"
        taille="panel"
        icone="cadenas"
        disabled={desactive}
        title={raison ?? undefined}
        onClick={() => setOuvert(true)}
      >
        Clôturer la semaine
      </Button>
      <Modal
        ouvert={ouvert}
        onFermer={() => setOuvert(false)}
        icone="cadenas"
        surtitre="Comptabilité · FISC"
        titre={`Clôturer la semaine ${numero} ?`}
        largeur={580}
        actions={
          <>
            <Button type="button" variante="verre" taille="panel" onClick={() => setOuvert(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              form="cloture-semaine"
              taille="panel"
              icone="cadenas"
              disabled={!valide || enCours}
            >
              Clôturer et générer la déclaration
            </Button>
          </>
        }
      >
        <form
          id="cloture-semaine"
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (valide) cloturer();
          }}
        >
          <p className="m-0 text-[15px] leading-[1.6] text-texte-doux">
            Le registre {periode} sera verrouillé : plus aucune opération ne pourra y être ajoutée
            ni modifiée, et la déclaration sera générée pour le FISC.
          </p>
          <dl className="m-0 flex flex-col gap-2.5 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] px-[18px] py-4 text-[14.5px]">
            {[
              ["Opérations enregistrées", String(resume.operations)],
              ["Recettes · dépenses", `${resume.recettes} · ${resume.depenses}`],
              ["Cautions détenues (hors résultat)", resume.cautions],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-texte-doux">{k}</dt>
                <dd className="m-0 font-bold chiffres">{v}</dd>
              </div>
            ))}
            <div className="mt-1.5 flex items-end justify-between gap-3 border-t border-[var(--bp-trait-8)] pt-4">
              <dt className="libelle text-[10.5px] tracking-[0.2em] text-or-texte">
                Résultat imposable
              </dt>
              <dd className="m-0 texte-or text-[28px] leading-none font-extrabold chiffres">
                {resume.resultat}
              </dd>
            </div>
          </dl>
          {avertissement && (
            <div className="flex gap-3 rounded-[14px] border border-[var(--bp-alerte-45)] bg-[var(--bp-alerte-7)] px-4 py-3.5 text-[13.5px] leading-[1.55] text-texte-doux">
              <Icon nom="alerte" taille={18} className="mt-0.5 flex-none text-alerte-texte" />
              <p className="m-0">{avertissement}</p>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <label htmlFor="confirmation-cloture" className="bp-label-champ bp-label-champ--panel">
              <span>
                Pour confirmer, saisissez
                <strong className="mt-2 block tracking-[0.08em] text-texte">{attendu}</strong>
              </span>
            </label>
            <input
              id="confirmation-cloture"
              autoComplete="off"
              spellCheck={false}
              className="bp-fld bp-fld--panel font-extrabold tracking-[0.08em]"
              value={saisie}
              onChange={(e) => setSaisie(e.target.value.toUpperCase())}
            />
          </div>
          {erreur && (
            <p role="alert" className="bp-erreur m-0">
              <Icon nom="alerte" taille={14} />
              {erreur}
            </p>
          )}
        </form>
      </Modal>
    </>
  );
}
