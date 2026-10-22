"use client";

import { useState, useTransition } from "react";
import { actionModifierCompte } from "@/app/admin/(panel)/comptes/actions";
import { LIBELLES_ROLE } from "@/domaine/permissions";
import type { Role } from "@/domaine/types";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { DataGrid } from "../../ui/DataGrid";
import { Field } from "../../ui/Field";
import { Icon } from "../../ui/Icon";
import { MenuActions } from "../../ui/MenuActions";
import { Modal } from "../../ui/Modal";
import { Statut } from "../../ui/Statut";
import { Switch } from "../../ui/Switch";

export type LigneCompte = {
  id: string;
  discordId: string;
  nom: string;
  nomRp: string;
  /** Nom Discord, rappelé sous le nom RP. */
  nomDiscord: string;
  pseudo: string;
  avatarUrl: string | null;
  role: Role;
  actif: boolean;
  ajouteLe: string;
  ajoutePar: string;
  derniereConnexion: string;
  estMoi: boolean;
};

/** Tableau des comptes autorisés (maquette 21) : activation, rôle, actions. */
export function TableauComptes({ comptes }: { comptes: LigneCompte[] }) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const [edition, setEdition] = useState<LigneCompte | null>(null);
  const [nomRp, setNomRp] = useState("");

  const modifier = (
    compteId: string,
    modification: { role?: Role; actif?: boolean; nomRp?: string },
    apres?: () => void,
  ) =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionModifierCompte({ compteId, ...modification });
      if (!r.ok) setErreur(r.erreur);
      else apres?.();
    });

  return (
    <div className="flex flex-col gap-3" aria-busy={enCours}>
      {erreur && (
        <p role="alert" className="bp-erreur mx-4 my-0">
          <Icon nom="alerte" taille={14} />
          {erreur}
        </p>
      )}
      <div className="overflow-x-auto">
        <DataGrid
          libelle="Comptes autorisés"
          className="min-w-[1040px]"
          hauteurLigne={70}
          colonnes={[
            { cle: "compte", titre: "Compte Discord", largeur: "minmax(200px,1.3fr)" },
            { cle: "identifiant", titre: "Identifiant", largeur: "166px" },
            { cle: "role", titre: "Rôle", largeur: "128px" },
            { cle: "statut", titre: "Statut", largeur: "110px" },
            { cle: "ajoute", titre: "Ajouté le", largeur: "90px" },
            { cle: "par", titre: "Ajouté par", largeur: "126px" },
            { cle: "connexion", titre: "Dernière connexion", largeur: "112px" },
            { cle: "actions", titre: "Actions", largeur: "40px", titreMasque: true },
          ]}
          lignes={comptes.map((c) => ({
            cle: c.id,
            ton: c.actif ? undefined : "inactif",
            cellules: {
              compte: (
                <span className="flex items-center gap-3">
                  <Avatar nom={c.nom} url={c.avatarUrl} anneau={c.role === "ADMIN"} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate font-bold">
                      {c.nom}
                      {c.estMoi && (
                        <span className="text-xs font-semibold text-texte-attenue"> · vous</span>
                      )}
                    </span>
                    <span className="text-[12.5px] text-texte-attenue">
                      {c.pseudo ? `@${c.pseudo}` : "Première connexion attendue"}
                      {c.nomRp && c.nomDiscord && ` · ${c.nomDiscord}`}
                    </span>
                  </span>
                </span>
              ),
              identifiant: (
                <span className="text-[12.5px] tracking-[0.02em] chiffres text-texte-attenue">
                  {c.discordId}
                </span>
              ),
              role: (
                <Statut ton={c.role === "ADMIN" ? "or" : c.role === "FISC" ? "attenue" : "ok"}>
                  {LIBELLES_ROLE[c.role]}
                </Statut>
              ),
              statut: (
                <span className="flex items-center gap-2.5">
                  <Switch
                    libelleAccessible={`Compte de ${c.nom} actif`}
                    coche={c.actif}
                    disabled={c.estMoi || enCours}
                    onChange={(actif) => modifier(c.id, { actif })}
                  />
                  <span className="text-[13px] text-texte-doux">
                    {c.actif ? "Actif" : "Inactif"}
                  </span>
                </span>
              ),
              ajoute: <span className="chiffres text-texte-doux">{c.ajouteLe}</span>,
              par: <span className="text-texte-doux">{c.ajoutePar}</span>,
              connexion: <span className="text-[13px] text-texte-doux">{c.derniereConnexion}</span>,
              actions: (
                <MenuActions
                  libelle={`Plus d’actions pour ${c.nom}`}
                  elements={[
                    {
                      libelle: c.nomRp ? "Modifier le nom RP" : "Ajouter un nom RP",
                      icone: "crayon",
                      onSelect: () => {
                        setNomRp(c.nomRp);
                        setEdition(c);
                      },
                    },
                    ...(["ADMIN", "GESTIONNAIRE", "FISC"] as const)
                      .filter((r) => r !== c.role)
                      .map((r) => ({
                        libelle: `Passer ${r === "ADMIN" ? "administrateur" : r === "FISC" ? "FISC" : "gestionnaire"}`,
                        icone: r === "ADMIN" ? ("bouclier" as const) : ("personne" as const),
                        // On ne retire pas son propre rôle d'administrateur.
                        desactive: c.estMoi && c.role === "ADMIN",
                        onSelect: () => modifier(c.id, { role: r }),
                      })),
                    c.actif
                      ? {
                          libelle: "Désactiver le compte",
                          danger: true,
                          desactive: c.estMoi,
                          onSelect: () => modifier(c.id, { actif: false }),
                        }
                      : {
                          libelle: "Réactiver le compte",
                          icone: "valider",
                          onSelect: () => modifier(c.id, { actif: true }),
                        },
                  ]}
                />
              ),
            },
          }))}
        />
      </div>

      <Modal
        ouvert={edition !== null}
        onFermer={() => setEdition(null)}
        surtitre={edition ? `Compte ${edition.discordId}` : undefined}
        titre="Nom RP"
        actions={
          <>
            <Button type="button" variante="verre" taille="panel" onClick={() => setEdition(null)}>
              Annuler
            </Button>
            <Button type="submit" form="nom-rp" taille="panel" icone="valider" disabled={enCours}>
              Enregistrer
            </Button>
          </>
        }
      >
        <form
          id="nom-rp"
          onSubmit={(e) => {
            e.preventDefault();
            if (edition) modifier(edition.id, { nomRp }, () => setEdition(null));
          }}
        >
          <Field
            label="Nom du personnage"
            value={nomRp}
            maxLength={60}
            autoComplete="off"
            onChange={(e) => setNomRp(e.target.value)}
            aide="Utilisé partout : contrats, registre, déclarations. Vide : le nom Discord est repris."
          />
        </form>
      </Modal>
    </div>
  );
}
