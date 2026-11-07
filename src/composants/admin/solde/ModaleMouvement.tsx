"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  actionContrePasserMouvement,
  actionModifierMouvement,
} from "@/app/admin/(panel)/solde/actions";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Icon } from "../../ui/Icon";
import { Modal } from "../../ui/Modal";
import { DepotJustificatif } from "./DepotJustificatif";

/** Mouvement tel qu'affiché dans l'historique (valeurs déjà formatées côté serveur). */
export type MouvementAffiche = {
  id: string;
  numero: string;
  date: string;
  sens: "ENTREE" | "SORTIE";
  categorie: string;
  /** « Location », « Formation », « Cards » ou « Groupe ». */
  filiale: string;
  /** Section de la filiale (couleur d'accent) ; absente pour le Groupe. */
  filialeSlug?: string;
  montant: string;
  motif: string;
  contrat: { numero: string; href: string } | null;
  saisiPar: { nom: string; avatarUrl: string | null };
  justificatif: { numero: string | null; url: string | null } | null;
  exigeJustificatif: boolean;
  /** « Contre-passation de OP-43-027 », « Annulé par OP-43-036 », « Reporté de S43 »… */
  mentions: string[];
  barre: boolean;
  modifiable: boolean;
  /** Raison affichée quand le mouvement n'est pas modifiable. */
  verrou: string | null;
  contrePassable: boolean;
};

function Info({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="libelle text-[10.5px] tracking-[0.2em]">{k}</dt>
      <dd className="m-0 text-[14px] font-semibold">{children}</dd>
    </div>
  );
}

/** Fiche d'un mouvement : justificatif, correction du motif, contre-passation (§ 6.5). */
export function ModaleMouvement({
  mouvement: m,
  onFermer,
  onFait,
}: {
  mouvement: MouvementAffiche | null;
  onFermer: () => void;
  onFait: (message: string) => void;
}) {
  const [motif, setMotif] = useState(m?.motif ?? "");
  const [fichier, setFichier] = useState<File | null>(null);
  const [confirmer, setConfirmer] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();
  if (!m) return null;

  const corriger = () =>
    demarrer(async () => {
      setErreur(null);
      const f = new FormData();
      f.set("id", m.id);
      f.set("motif", motif);
      if (fichier) f.set("justificatif", fichier);
      const r = await actionModifierMouvement(f);
      if (r.ok) onFait(`${m.numero} corrigé.`);
      else setErreur(r.erreur);
    });

  const contrePasser = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionContrePasserMouvement(m.id);
      if (r.ok) onFait(`${m.numero} contre-passé par ${r.donnees.numero.replace(/^\d{4}-/, "")}.`);
      else {
        setConfirmer(false);
        setErreur(r.erreur);
      }
    });

  const change = motif.trim() !== m.motif || fichier !== null;
  return (
    <Modal
      ouvert
      onFermer={onFermer}
      surtitre={`${m.numero} · ${m.date}`}
      titre={confirmer ? "Contre-passer ce mouvement ?" : "Détail du mouvement"}
      largeur={640}
      decoupee
      actions={
        confirmer ? (
          <>
            <Button
              type="button"
              variante="verre"
              taille="panel"
              onClick={() => setConfirmer(false)}
            >
              Retour
            </Button>
            <Button
              type="button"
              variante="danger"
              taille="panel"
              icone="alerte"
              disabled={enCours}
              onClick={contrePasser}
            >
              Contre-passer {m.numero}
            </Button>
          </>
        ) : (
          <>
            {m.contrePassable && (
              <Button
                type="button"
                variante="danger"
                taille="panel"
                icone="alerte"
                onClick={() => setConfirmer(true)}
              >
                Contre-passer
              </Button>
            )}
            <Button type="button" variante="verre" taille="panel" onClick={onFermer}>
              Fermer
            </Button>
            {m.modifiable && (
              <Button
                type="submit"
                form="corriger-mouvement"
                taille="panel"
                icone="valider"
                disabled={!change || enCours}
              >
                Enregistrer
              </Button>
            )}
          </>
        )
      }
    >
      {confirmer ? (
        <p className="m-0 text-sm leading-[1.6] text-texte-doux">
          Un mouvement inverse de <strong className="text-texte">{m.montant}</strong>, même
          catégorie, motif « Annulation de {m.numero} », est inscrit maintenant dans la semaine
          ouverte. Les deux lignes restent au registre, barrées. Rien n’est effacé.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          <dl className="m-0 grid grid-cols-3 gap-x-6 gap-y-4 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] px-[18px] py-4 max-sm:grid-cols-2">
            <Info k="Sens">
              <span className={m.sens === "ENTREE" ? "text-or-texte" : undefined}>
                {m.sens === "ENTREE" ? "Entrée" : "Sortie"}
              </span>
            </Info>
            <Info k="Catégorie">{m.categorie}</Info>
            <Info k="Filiale">{m.filiale}</Info>
            <Info k="Montant">
              <span className={`chiffres ${m.sens === "ENTREE" ? "text-or-texte" : ""}`}>
                {m.montant}
              </span>
            </Info>
            <Info k="Contrat · vente">{m.contrat?.numero ?? "—"}</Info>
            <Info k="Saisi par">{m.saisiPar.nom}</Info>
            <Info k="Justificatif">{m.justificatif?.numero ?? "—"}</Info>
          </dl>
          {m.mentions.length > 0 && (
            <p className="m-0 flex items-center gap-2 text-[13px] text-texte-doux">
              <Icon nom="information" taille={16} className="text-argent-1" />
              {m.mentions.join(" · ")}
            </p>
          )}

          {m.justificatif?.url ? (
            <figure className="m-0 flex flex-col gap-2">
              <a href={m.justificatif.url} target="_blank" rel="noreferrer" className="block">
                <Image
                  src={m.justificatif.url}
                  alt={`Justificatif ${m.justificatif.numero ?? ""}`}
                  width={584}
                  height={260}
                  unoptimized
                  className="max-h-[260px] w-full rounded-[14px] border border-[var(--bp-trait-8)] object-contain"
                />
              </a>
              <figcaption className="text-xs text-texte-attenue">
                Cliquez sur l’image pour l’ouvrir en taille réelle.
              </figcaption>
            </figure>
          ) : (
            m.exigeJustificatif && (
              <p className="bp-erreur m-0">
                <Icon nom="alerte" taille={14} />
                Dépense sans justificatif : la semaine ne pourra pas être clôturée.
              </p>
            )
          )}

          {m.modifiable ? (
            <form
              id="corriger-mouvement"
              className="flex flex-col gap-5"
              onSubmit={(e) => {
                e.preventDefault();
                corriger();
              }}
            >
              <Field
                label="Motif"
                required
                minLength={3}
                maxLength={160}
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
                aide="Le montant, le sens et la catégorie ne se modifient pas : contre-passez en cas d’erreur."
              />
              <DepotJustificatif
                fichier={fichier}
                onChange={setFichier}
                exige={m.exigeJustificatif && !m.justificatif?.url}
                remplacement={Boolean(m.justificatif?.url)}
              />
            </form>
          ) : (
            m.verrou && (
              <p className="m-0 flex items-center gap-2 text-[13px] text-texte-attenue">
                <Icon nom="cadenas" taille={16} />
                {m.verrou}
              </p>
            )
          )}
          {erreur && (
            <p role="alert" className="bp-erreur m-0">
              <Icon nom="alerte" taille={14} />
              {erreur}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
