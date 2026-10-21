"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { Resultat } from "@/lib/resultat";
import { Button } from "../../ui/Button";
import { GlassCard } from "../../ui/GlassCard";
import { Icon } from "../../ui/Icon";

/** Enregistrement d'une section : état d'envoi, message de confirmation ou d'erreur. */
export function useEnregistrement<D>(action: (d: D) => Promise<Resultat<unknown>>) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const [etat, setEtat] = useState<{ ok: boolean; texte: string } | null>(null);
  const enregistrer = (d: D, succes = "Modifications enregistrées : le site est à jour.") =>
    demarrer(async () => {
      setEtat(null);
      const r = await action(d);
      setEtat(r.ok ? { ok: true, texte: succes } : { ok: false, texte: r.erreur });
      if (r.ok) router.refresh();
    });
  return { enregistrer, enCours, etat, effacer: () => setEtat(null) };
}

export function MessageEtat({ etat }: { etat: { ok: boolean; texte: string } | null }) {
  if (!etat) return null;
  return etat.ok ? (
    <p role="status" className="m-0 flex items-center gap-2 text-[13px] text-texte-doux">
      <Icon nom="valider" taille={16} className="text-or-icone" />
      {etat.texte}
    </p>
  ) : (
    <p role="alert" className="bp-erreur m-0">
      <Icon nom="alerte" taille={14} />
      {etat.texte}
    </p>
  );
}

/** Carte d'une section de Paramètres, dans le style du formulaire véhicule (maquette 15). */
export function SectionParametres({
  id,
  titre,
  description,
  children,
  onEnregistrer,
  enCours,
  etat,
  libelleBouton = "Enregistrer",
}: {
  id: string;
  titre: string;
  description: ReactNode;
  children: ReactNode;
  /** Absent : section à enregistrement immédiat (catégories). */
  onEnregistrer?: () => void;
  enCours?: boolean;
  etat?: { ok: boolean; texte: string } | null;
  libelleBouton?: string;
}) {
  const contenu = (
    <>
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-titre`} className="m-0 titre text-lg font-semibold">
          {titre}
        </h2>
        <p className="m-0 text-[13px] leading-[1.5] text-texte-attenue">{description}</p>
      </div>
      {children}
      {onEnregistrer ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--bp-trait-8)] pt-4">
          <MessageEtat etat={etat ?? null} />
          <Button
            type="submit"
            taille="panel"
            icone="valider"
            disabled={enCours}
            className="ml-auto"
          >
            {libelleBouton}
          </Button>
        </div>
      ) : (
        <MessageEtat etat={etat ?? null} />
      )}
    </>
  );
  const classes = "flex scroll-mt-5 flex-col gap-[18px] rounded-[24px] px-7 py-[26px]";
  return onEnregistrer ? (
    <GlassCard
      as="section"
      variante="admin"
      id={id}
      aria-labelledby={`${id}-titre`}
      className={classes}
    >
      <form
        className="flex flex-col gap-[18px]"
        onSubmit={(e) => {
          e.preventDefault();
          onEnregistrer();
        }}
      >
        {contenu}
      </form>
    </GlassCard>
  ) : (
    <GlassCard
      as="section"
      variante="admin"
      id={id}
      aria-labelledby={`${id}-titre`}
      className={classes}
    >
      {contenu}
    </GlassCard>
  );
}
