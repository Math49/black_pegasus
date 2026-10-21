"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import { TAILLE_MAX_FICHIER } from "@/lib/fichiers";
import { IconButton } from "../../ui/Button";
import { Icon } from "../../ui/Icon";

const TYPES = ["image/png", "image/jpeg", "image/webp"];

const taille = (octets: number) =>
  octets >= 1024 * 1024
    ? `${(octets / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`
    : `${Math.max(1, Math.round(octets / 1024))} Ko`;

/**
 * Zone de dépôt d'un justificatif (capture d'écran du jeu) avec aperçu, maquette 13.
 * Le contrôle définitif (type réel, poids) est refait côté serveur.
 */
export function DepotJustificatif({
  fichier,
  onChange,
  exige,
  remplacement = false,
  erreur,
}: {
  fichier: File | null;
  onChange: (f: File | null) => void;
  exige: boolean;
  /** Un justificatif existe déjà : le fichier déposé le remplace. */
  remplacement?: boolean;
  erreur?: string | null;
}) {
  const id = useId();
  const champ = useRef<HTMLInputElement>(null);
  const [survol, setSurvol] = useState(false);
  const [refus, setRefus] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);

  useEffect(() => () => void (apercu && URL.revokeObjectURL(apercu)), [apercu]);

  const choisir = (f: File | null) => {
    setRefus(null);
    if (f && !TYPES.includes(f.type))
      return setRefus("Format refusé : PNG, JPG ou WEBP uniquement.");
    if (f && f.size > TAILLE_MAX_FICHIER) return setRefus("Fichier trop lourd : 10 Mo maximum.");
    setApercu(f ? URL.createObjectURL(f) : null);
    onChange(f);
    if (!f && champ.current) champ.current.value = "";
  };

  const message = refus ?? erreur;
  return (
    <div className="flex flex-col gap-2.5">
      <span id={`${id}-titre`} className="bp-label-champ bp-label-champ--panel">
        <span>
          {remplacement ? "Remplacer le justificatif" : "Justificatif"}{" "}
          <span className="font-medium text-texte-attenue">
            ·{" "}
            {remplacement
              ? "facultatif"
              : exige
                ? "exigé par le FISC pour toute dépense"
                : "facultatif"}
          </span>
        </span>
      </span>
      <label
        className="bp-depot"
        data-survol={survol || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setSurvol(true);
        }}
        onDragLeave={() => setSurvol(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSurvol(false);
          choisir(e.dataTransfer.files[0] ?? null);
        }}
      >
        <span className="bp-depot__icone">
          <Icon nom="televerser" taille={20} />
        </span>
        <span className="text-[14.5px] font-bold">Déposez la capture d’écran du jeu ici</span>
        <span className="text-[12.5px] text-texte-attenue">
          ou <span className="font-bold text-or-texte">parcourir vos fichiers</span> · PNG ou JPG ·
          10 Mo max.
        </span>
        <input
          ref={champ}
          type="file"
          accept={TYPES.join(",")}
          aria-labelledby={`${id}-titre`}
          aria-describedby={message ? `${id}-erreur` : undefined}
          className="sr-only"
          onChange={(e) => choisir(e.target.files?.[0] ?? null)}
        />
      </label>
      {fichier && apercu && (
        <div className="flex items-center gap-3.5 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-4)] px-3 py-2.5">
          <Image
            src={apercu}
            alt="Aperçu du justificatif"
            width={64}
            height={42}
            unoptimized
            className="rounded-lg h-[42px] w-16 object-cover"
          />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="truncate text-[13.5px] font-bold">{fichier.name}</span>
            <span className="text-xs text-texte-attenue">
              {taille(fichier.size)} · ajouté à l’instant
            </span>
          </span>
          <IconButton
            libelle="Retirer le justificatif"
            icone="fermer"
            onClick={() => choisir(null)}
          />
        </div>
      )}
      {message && (
        <span id={`${id}-erreur`} role="alert" className="bp-erreur">
          <Icon nom="alerte" taille={14} />
          {message}
        </span>
      )}
    </div>
  );
}
