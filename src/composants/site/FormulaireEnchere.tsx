"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actionEncherir } from "@/app/(public)/cards/encheres/[id]/actions";
import { Button } from "@/composants/ui/Button";
import { Field } from "@/composants/ui/Field";
import { Icon } from "@/composants/ui/Icon";

/** Offre sur une enchère : coordonnées en jeu et montant (jamais affichés sur le site). */
export function FormulaireEnchere({
  enchereId,
  minimum,
}: {
  enchereId: string;
  /** Minimum de la prochaine offre, déjà formaté (« $1 400 »). */
  minimum: string;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <form
      aria-label="Enchérir"
      className="glass-site flex min-w-0 flex-col gap-5 p-7"
      onSubmit={(e) => {
        e.preventDefault();
        const formulaire = e.currentTarget;
        const donnees = new FormData(formulaire);
        setEtat(null);
        demarrer(async () => {
          const r = await actionEncherir(enchereId, donnees);
          setEtat(
            r.ok
              ? {
                  ok: true,
                  message:
                    "Offre enregistrée. Si elle l’emporte, la boutique vous contactera en jeu.",
                }
              : { ok: false, message: r.erreur },
          );
          if (r.ok) {
            formulaire.reset();
            router.refresh();
          }
        });
      }}
    >
      <h2 className="m-0 titre text-xl font-semibold">Enchérir</h2>
      <div className="grid grid-cols-2 gap-5 max-sm:grid-cols-1">
        <Field
          label="Nom RP"
          name="nom"
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
      <Field
        label="Votre offre ($)"
        name="montant"
        variante="site"
        required
        inputMode="numeric"
        autoComplete="off"
        aide={`Au moins ${minimum}. Votre nom et votre téléphone ne sont jamais affichés.`}
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
      <Button type="submit" disabled={enCours} className="self-start" icone="etiquette">
        {enCours ? "Envoi en cours…" : "Placer mon offre"}
      </Button>
    </form>
  );
}
