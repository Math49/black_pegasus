"use client";

import { useState, useTransition } from "react";
import { actionModifierCompte } from "@/app/admin/(panel)/comptes/actions";
import type { Role } from "@/domaine/types";
import { Avatar } from "../../ui/Avatar";
import { DataGrid } from "../../ui/DataGrid";
import { Icon } from "../../ui/Icon";
import { MenuActions } from "../../ui/MenuActions";
import { Statut } from "../../ui/Statut";
import { Switch } from "../../ui/Switch";

export type LigneCompte = {
  id: string;
  discordId: string;
  nom: string;
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

  const modifier = (compteId: string, modification: { role?: Role; actif?: boolean }) =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionModifierCompte({ compteId, ...modification });
      if (!r.ok) setErreur(r.erreur);
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
                <Statut ton={c.role === "ADMIN" ? "or" : "ok"}>
                  {c.role === "ADMIN" ? "Administrateur" : "Gestionnaire"}
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
                    c.role === "ADMIN"
                      ? {
                          libelle: "Passer gestionnaire",
                          icone: "personne",
                          desactive: c.estMoi,
                          onSelect: () => modifier(c.id, { role: "GESTIONNAIRE" }),
                        }
                      : {
                          libelle: "Passer administrateur",
                          icone: "bouclier",
                          onSelect: () => modifier(c.id, { role: "ADMIN" }),
                        },
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
    </div>
  );
}
