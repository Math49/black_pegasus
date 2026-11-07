"use client";

import { useState, useTransition } from "react";
import { actionDemanderFormation } from "@/app/(public)/formation/actions";
import { Button } from "@/composants/ui/Button";
import { Field, Select, TextArea } from "@/composants/ui/Field";
import { Icon } from "@/composants/ui/Icon";

export function FormulaireFormation({
  permis,
}: {
  permis: { id: string; nom: string; domaine: string }[];
}) {
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <form
      aria-label="Demande de formation"
      className="glass-site flex min-w-0 flex-col gap-5 p-7"
      onSubmit={(e) => {
        e.preventDefault();
        const formulaire = e.currentTarget;
        const donnees = new FormData(formulaire);
        setEtat(null);
        demarrer(async () => {
          const r = await actionDemanderFormation(donnees);
          setEtat(
            r.ok
              ? {
                  ok: true,
                  message: "Votre demande a été transmise. Notre équipe vous recontactera en jeu.",
                }
              : { ok: false, message: r.erreur },
          );
          if (r.ok) formulaire.reset();
        });
      }}
    >
      <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
        <Field
          label="Nom RP"
          name="nomRp"
          variante="site"
          required
          minLength={2}
          maxLength={60}
          autoComplete="off"
        />
        <Field
          label="Téléphone en jeu"
          name="telephone"
          variante="site"
          required
          minLength={3}
          maxLength={15}
          autoComplete="off"
          inputMode="tel"
        />
      </div>
      <Select
        label="Permis souhaité"
        name="permisId"
        variante="site"
        defaultValue=""
        options={[
          { valeur: "", libelle: "Demande générale" },
          ...permis.map((p) => ({ valeur: p.id, libelle: `${p.domaine} · ${p.nom}` })),
        ]}
      />
      <TextArea
        label="Votre message"
        name="message"
        variante="site"
        required
        minLength={10}
        maxLength={1000}
        rows={5}
        aide="10 à 1000 caractères. Indiquez uniquement les informations utiles à votre formation en jeu."
      />
      <div hidden aria-hidden="true">
        <label>
          Site web
          <input name="siteWeb" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {etat && (
        <p
          role={etat.ok ? "status" : "alert"}
          className={etat.ok ? "m-0 flex items-center gap-2 text-texte-doux" : "bp-erreur m-0"}
        >
          <Icon nom={etat.ok ? "valider" : "alerte"} taille={18} />
          {etat.message}
        </p>
      )}
      <Button type="submit" disabled={enCours} className="self-start" icone="contrat">
        {enCours ? "Envoi en cours…" : "Envoyer ma demande"}
      </Button>
    </form>
  );
}
