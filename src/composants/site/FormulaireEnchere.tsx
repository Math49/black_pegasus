"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { actionEncherir } from "@/app/(public)/cards/encheres/[id]/actions";
import { SEPARATEUR_MILLIERS } from "@/domaine/argent";
import { Button } from "@/composants/ui/Button";
import { Field } from "@/composants/ui/Field";
import { Icon } from "@/composants/ui/Icon";

/** « 160000 » → « 160 000 » pendant la saisie (chiffres seulement). */
const grouper = (t: string) =>
  t
    .replace(/\D/g, "")
    .replace(/^0+(?=\d)/, "")
    .slice(0, 9)
    .replace(/\B(?=(\d{3})+(?!\d))/g, SEPARATEUR_MILLIERS);

/** Offre sur une enchère : coordonnées en jeu et montant (jamais affichés sur le site). */
export function FormulaireEnchere({
  enchereId,
  minimum,
  montantMinimum,
}: {
  enchereId: string;
  /** Minimum de la prochaine offre, déjà formaté (« $1 400 »). */
  minimum: string;
  /** Même minimum en dollars : valeur proposée dans le champ du montant. */
  montantMinimum: number;
}) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<{ ok: boolean; message: string } | null>(null);
  // Montant prérempli au minimum ; remonté si le minimum dépasse la saisie (nouvelle offre).
  const [montant, setMontant] = useState(grouper(String(montantMinimum)));
  const [minimumConnu, setMinimumConnu] = useState(montantMinimum);
  if (minimumConnu !== montantMinimum) {
    setMinimumConnu(montantMinimum);
    const saisi = Number(montant.replace(/\D/g, ""));
    if (!saisi || saisi < montantMinimum) setMontant(grouper(String(montantMinimum)));
  }
  return (
    <form
      aria-label="Enchérir"
      className="glass-site flex min-w-0 flex-col gap-5 p-7"
      onSubmit={(e) => {
        e.preventDefault();
        const donnees = new FormData(e.currentTarget);
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
          // Nom et téléphone restent remplis pour pouvoir surenchérir ; le montant suit le minimum.
          if (r.ok) router.refresh();
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
        value={montant}
        onChange={(e) => setMontant(grouper(e.target.value))}
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
