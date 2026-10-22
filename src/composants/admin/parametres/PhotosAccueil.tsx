"use client";

import Image from "next/image";
import { useId } from "react";
import { actionPhotoAccueil } from "@/app/admin/(panel)/parametres/actions";
import type { TypeVehicule } from "@/domaine/types";
import { libelleType } from "@/domaine/unites";
import { Button } from "../../ui/Button";
import { Icon } from "../../ui/Icon";
import { SectionParametres, useEnregistrement } from "./Section";

export type PhotoAccueil = {
  type: TypeVehicule;
  /** Photo choisie, ou null : visuel par défaut affiché. */
  url: string | null;
  parDefaut: string;
};

function Tuile({
  photo,
  enCours,
  envoyer,
}: {
  photo: PhotoAccueil;
  enCours: boolean;
  envoyer: (f: FormData, succes: string) => void;
}) {
  const id = useId();
  const nom = libelleType(photo.type, true);
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="titre text-[15px] font-semibold">{nom}</span>
        <span className="text-xs text-texte-attenue">
          {photo.url ? "Photo personnalisée" : "Visuel par défaut"}
        </span>
      </div>
      <div className="relative aspect-[3/4] max-h-[260px] overflow-hidden rounded-[12px] border border-[var(--bp-trait-10)] bg-surface">
        <Image
          src={photo.url ?? photo.parDefaut}
          alt={`Carte ${nom} de l’accueil`}
          fill
          sizes="300px"
          className="object-cover"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={id}
          className="bp-btn bp-btn--verre bp-btn--panel-petit cursor-pointer has-[input:focus-visible]:outline-2"
          aria-disabled={enCours || undefined}
        >
          <Icon nom="televerser" taille={18} />
          {photo.url ? "Remplacer" : "Choisir une photo"}
          <input
            id={id}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={enCours}
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              const donnees = new FormData();
              donnees.set("type", photo.type);
              donnees.set("photo", f);
              envoyer(donnees, `Photo de la carte « ${nom} » enregistrée.`);
            }}
          />
        </label>
        {photo.url && (
          <Button
            type="button"
            variante="verre"
            taille="panel-petit"
            icone="fermer"
            disabled={enCours}
            onClick={() => {
              const donnees = new FormData();
              donnees.set("type", photo.type);
              donnees.set("retirer", "1");
              envoyer(donnees, `Carte « ${nom} » : retour au visuel par défaut.`);
            }}
          >
            Retirer
          </Button>
        )}
      </div>
    </div>
  );
}

/** Photos des cartes « Trois éléments, une seule exigence » de l'accueil. */
export function PhotosAccueil({ photos }: { photos: PhotoAccueil[] }) {
  const { enregistrer, enCours, etat } = useEnregistrement(actionPhotoAccueil);
  return (
    <SectionParametres
      id="photos"
      titre="Photos de l’accueil"
      description="Une photo par carte « Trois éléments, une seule exigence » (PNG, JPG ou WEBP, 10 Mo maximum, format portrait conseillé). Sans photo, le visuel d’ambiance par défaut est affiché. Chaque changement est enregistré aussitôt."
      etat={etat}
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4">
        {photos.map((p) => (
          <Tuile key={p.type} photo={p} enCours={enCours} envoyer={enregistrer} />
        ))}
      </div>
    </SectionParametres>
  );
}
