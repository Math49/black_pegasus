"use client";

import { useState, useTransition } from "react";
import {
  actionAjouterCompte,
  actionVerifierIdentifiant,
} from "@/app/admin/(panel)/comptes/actions";
import type { Role } from "@/domaine/types";
import type { VerificationIdentifiant } from "@/services/comptes";
import { Avatar } from "../../ui/Avatar";
import { Button } from "../../ui/Button";
import { Field } from "../../ui/Field";
import { Icon } from "../../ui/Icon";
import { Modal } from "../../ui/Modal";

const ROLES: { valeur: Role; titre: string; texte: string }[] = [
  { valeur: "GESTIONNAIRE", titre: "Gestionnaire", texte: "Contrats, véhicules et mouvements." },
  { valeur: "ADMIN", titre: "Administrateur", texte: "Accès complet, comptes et clôtures." },
  { valeur: "FISC", titre: "FISC", texte: "Consultation des contrats, du solde et des comptes." },
];

function Apercu({ v }: { v: VerificationIdentifiant }) {
  const cadre =
    "flex items-center gap-3.5 rounded-[14px] border border-[var(--bp-trait-10)] bg-[var(--bp-voile-4)] px-4 py-3.5";
  switch (v.statut) {
    case "trouve":
      return (
        <div className={cadre}>
          <Avatar nom={v.profil.nom} url={v.profil.avatarUrl} taille={46} />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-[15px] font-bold">{v.profil.nom}</span>
            <span className="text-[13px] text-texte-attenue">
              @{v.profil.pseudo} · compte trouvé
            </span>
          </span>
          <Icon nom="valider" taille={22} className="text-or-icone" />
        </div>
      );
    case "non-verifie":
      return (
        <div className={cadre}>
          <Icon nom="information" className="text-argent-1" />
          <span className="text-[13px] leading-[1.5] text-texte-doux">
            Aperçu Discord indisponible : le pseudo et l’avatar seront récupérés à la première
            connexion.
          </span>
        </div>
      );
    case "existant":
      return (
        <p role="alert" className="bp-erreur m-0">
          <Icon nom="alerte" taille={14} />
          Déjà autorisé : {v.nom}.
        </p>
      );
    case "introuvable":
      return (
        <p role="alert" className="bp-erreur m-0">
          <Icon nom="alerte" taille={14} />
          Aucun compte Discord ne porte cet identifiant.
        </p>
      );
    case "invalide":
      return (
        <p role="alert" className="bp-erreur m-0">
          <Icon nom="alerte" taille={14} />
          Identifiant invalide : 17 à 20 chiffres.
        </p>
      );
  }
}

/** Modale « Ajouter un compte » (maquette 22). */
export function ModaleAjoutCompte() {
  const [ouvert, setOuvert] = useState(false);
  const [discordId, setDiscordId] = useState("");
  const [role, setRole] = useState<Role>("GESTIONNAIRE");
  const [nomRp, setNomRp] = useState("");
  const [verification, setVerification] = useState<VerificationIdentifiant | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const fermer = () => {
    setOuvert(false);
    setDiscordId("");
    setRole("GESTIONNAIRE");
    setNomRp("");
    setVerification(null);
    setErreur(null);
  };

  const verifier = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionVerifierIdentifiant(discordId);
      if (r.ok) setVerification(r.donnees);
      else setErreur(r.erreur);
    });

  const ajouter = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionAjouterCompte({ discordId, role, nomRp });
      if (r.ok) fermer();
      else setErreur(r.erreur);
    });

  const bloque = verification?.statut === "existant" || verification?.statut === "introuvable";

  return (
    <>
      <Button taille="panel" icone="plus" onClick={() => setOuvert(true)}>
        Ajouter un compte
      </Button>
      <Modal
        ouvert={ouvert}
        onFermer={fermer}
        surtitre="Comptes"
        titre="Ajouter un compte"
        largeur={640}
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            ajouter();
          }}
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="discord-id" className="bp-label-champ bp-label-champ--panel">
              Identifiant Discord
            </label>
            <div className="flex gap-2.5">
              <input
                id="discord-id"
                className="bp-fld bp-fld--panel font-bold tracking-[0.04em] chiffres"
                inputMode="numeric"
                autoComplete="off"
                required
                value={discordId}
                aria-describedby="discord-id-aide"
                onChange={(e) => {
                  setDiscordId(e.target.value);
                  setVerification(null);
                }}
              />
              <Button
                type="button"
                variante="verre"
                taille="panel"
                disabled={!discordId || enCours}
                onClick={verifier}
              >
                Vérifier
              </Button>
            </div>
            <span id="discord-id-aide" className="text-[12.5px] leading-[1.5] text-texte-attenue">
              Discord › Paramètres › Avancés › activer le Mode développeur, puis clic droit sur le
              profil › Copier l’identifiant.
            </span>
          </div>

          <div aria-live="polite">{verification && <Apercu v={verification} />}</div>

          <Field
            label="Nom RP"
            value={nomRp}
            maxLength={60}
            autoComplete="off"
            onChange={(e) => setNomRp(e.target.value)}
            aide="Nom du personnage en jeu, utilisé sur les contrats, le registre et les déclarations. Sinon, le nom Discord."
          />

          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-[12.5px] font-semibold text-texte-doux">Rôle</legend>
            <div className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
              {ROLES.map((r) => (
                <label key={r.valeur} className="bp-choix relative">
                  <input
                    type="radio"
                    name="role"
                    value={r.valeur}
                    checked={role === r.valeur}
                    onChange={() => setRole(r.valeur)}
                  />
                  <span className="flex items-center gap-2.5 text-[14.5px] font-extrabold">
                    <span className="bp-choix__point" aria-hidden="true" />
                    {r.titre}
                  </span>
                  <span className="text-texte-attenue">{r.texte}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {erreur && (
            <p role="alert" className="bp-erreur m-0">
              <Icon nom="alerte" taille={14} />
              {erreur}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3.5 border-t border-[var(--bp-trait-8)] pt-5">
            <span className="max-w-[220px] text-[12.5px] leading-[1.5] text-texte-attenue">
              Accès immédiat via « Se connecter avec Discord ».
            </span>
            <div className="flex gap-2.5">
              <Button type="button" variante="verre" taille="panel" onClick={fermer}>
                Annuler
              </Button>
              <Button
                type="submit"
                taille="panel"
                icone="plus"
                disabled={!discordId || bloque || enCours}
              >
                Ajouter le compte
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
