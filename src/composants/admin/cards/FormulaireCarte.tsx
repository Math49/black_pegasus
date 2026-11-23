"use client";

import Image from "next/image";
import { useState } from "react";
import { actionEnregistrerCarte } from "@/app/admin/(panel)/cards/actions";
import { Button } from "@/composants/ui/Button";
import { Checkbox, Field, Select } from "@/composants/ui/Field";
import { Switch } from "@/composants/ui/Switch";
import { MessageEtat, useEnregistrement } from "@/composants/admin/parametres/Section";
import type { CarteAdmin } from "./GestionCards";

/** Ajout ou modification d'une carte (l'ordre se règle par glisser-déposer). */
export function FormulaireCarte({
  carte,
  categories,
  categorieParDefaut,
  fermer,
}: {
  carte: CarteAdmin | null;
  categories: readonly { id: string; nom: string }[];
  categorieParDefaut?: string;
  fermer: () => void;
}) {
  const [visible, setVisible] = useState(carte?.visible ?? true);
  // Mise en enchère : à la création, ou sur une carte sans enchère ouverte.
  const [mode, setMode] = useState<"vente" | "enchere">("vente");
  const enchereOuverte = Boolean(carte?.enchere);
  const { enregistrer, enCours, etat } = useEnregistrement(async (donnees: FormData) => {
    const r = await actionEnregistrerCarte(donnees);
    if (r.ok) fermer();
    return r;
  });
  return (
    <form
      aria-label={carte ? `Modifier ${carte.nom}` : "Ajouter une carte"}
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        const d = new FormData(e.currentTarget);
        d.set("id", carte?.id ?? "");
        d.set("visible", visible ? "1" : "0");
        d.set("mode", enchereOuverte ? "vente" : mode);
        enregistrer(d);
      }}
    >
      <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
        <Field
          label="Nom de la carte"
          name="nom"
          required
          minLength={2}
          maxLength={100}
          defaultValue={carte?.nom}
        />
        <Select
          label="Catégorie"
          name="categorieId"
          required
          defaultValue={carte?.categorieId ?? categorieParDefaut ?? categories[0]?.id}
          aide={carte ? "Une nouvelle catégorie place la carte en fin de liste." : undefined}
          options={categories.map((c) => ({ valeur: c.id, libelle: c.nom }))}
        />
        <Field
          label="Prix ($)"
          name="prix"
          type="number"
          required
          min={0}
          max={10_000_000}
          step={1}
          defaultValue={carte?.prix}
        />
        <Field
          label="Exemplaires en stock"
          name="stock"
          type="number"
          required
          min={0}
          max={100_000}
          step={1}
          defaultValue={carte?.stock ?? 0}
          aide={carte ? "Une correction du stock est inscrite au journal." : undefined}
        />
        <Field
          label="Photo (facultative)"
          name="photo"
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aide="PNG, JPG ou WEBP, 10 Mo maximum. Sans photo, le visuel par défaut s’affiche."
          className="col-span-full"
        />
      </div>
      {carte?.photoUrl && (
        <div className="flex flex-wrap items-center gap-4">
          <Image
            src={carte.photoUrl}
            // Original privé (session du panel) : pas d'optimisation côté serveur.
            unoptimized
            alt={`Photo actuelle de ${carte.nom}`}
            width={72}
            height={100}
            className="h-[100px] w-[72px] rounded-[8px] object-cover"
          />
          <Checkbox name="retirerPhoto" value="1" label="Retirer la photo" />
        </div>
      )}
      {enchereOuverte ? (
        <p className="m-0 text-sm text-texte-doux">
          Une enchère est en cours sur cette carte : elle se gère depuis sa page d’enchère.
        </p>
      ) : (
        <fieldset className="m-0 flex flex-col gap-4 rounded-[14px] border border-[var(--bp-trait-8)] p-4">
          <legend className="px-1 titre text-[15px] font-semibold">Mode de vente</legend>
          <Select
            label="Mettre en vente"
            value={mode}
            onChange={(e) => setMode(e.target.value as "vente" | "enchere")}
            options={[
              { valeur: "vente", libelle: "Vente classique (prix fixe)" },
              { valeur: "enchere", libelle: "Enchère (un exemplaire)" },
            ]}
          />
          {mode === "enchere" && (
            <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
              <Field
                label="Montant de départ ($)"
                name="montantDepart"
                type="number"
                required
                min={1}
                max={10_000_000}
                step={1}
              />
              <Field
                label="Pas minimum entre deux offres ($)"
                name="pasMinimum"
                type="number"
                required
                min={1}
                max={1_000_000}
                step={1}
              />
              <Field
                label="Durée (heures)"
                name="dureeHeures"
                type="number"
                required
                min={1}
                max={720}
                step={1}
              />
              <Field
                label="Temps additionnel (minutes)"
                name="tempsAdditionnelMin"
                type="number"
                required
                min={0}
                max={1440}
                step={1}
                aide="Une offre reçue alors qu’il reste moins que ce délai repousse la fin d’autant."
              />
            </div>
          )}
        </fieldset>
      )}
      <Switch label="Visible sur le site" coche={visible} onChange={setVisible} />
      <MessageEtat etat={etat} />
      <div className="flex flex-wrap justify-end gap-3">
        <Button variante="verre" taille="panel" onClick={fermer} disabled={enCours}>
          Annuler
        </Button>
        <Button type="submit" taille="panel" disabled={enCours}>
          Enregistrer la carte
        </Button>
      </div>
    </form>
  );
}
