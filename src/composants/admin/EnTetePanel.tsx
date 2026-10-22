import Link from "next/link";
import { nomCompte } from "@/domaine/comptes";
import type { ReactNode } from "react";
import { LIBELLES_ROLE } from "@/domaine/permissions";
import { exigerSession } from "@/lib/garde";
import { lireDonneesPanel } from "@/services/panel";
import { Avatar } from "../ui/Avatar";
import { IconButton } from "../ui/Button";
import { GlassCard } from "../ui/GlassCard";
import { Statut } from "../ui/Statut";
import { Cloche } from "./Cloche";

export type EtapeFil = { libelle: string; href?: string };

/**
 * En-tête de verre des pages du panel : fil d'Ariane (ou surtitre), titre, cloche et compte.
 * Chaque page le pose avec son propre titre.
 */
export async function EnTetePanel({
  titre,
  fil,
  surtitre,
  retour,
}: {
  titre: ReactNode;
  /** Fil d'Ariane affiché en petites capitales : « Gestion · Véhicules ». */
  fil?: EtapeFil[];
  /** Surtitre libre (date du jour sur le tableau de bord). */
  surtitre?: ReactNode;
  retour?: { href: string; libelle: string };
}) {
  const [compte, d] = await Promise.all([exigerSession(), lireDonneesPanel()]);
  const nom = nomCompte(compte);

  return (
    <GlassCard
      as="header"
      variante="admin"
      className="flex flex-wrap items-center justify-between gap-4 py-3.5 pr-4 pl-6"
    >
      <div className="flex items-center gap-4">
        {retour && <IconButton href={retour.href} libelle={retour.libelle} icone="flecheGauche" />}
        <div className="flex flex-col gap-1">
          {fil ? (
            <nav aria-label="Fil d’Ariane" className="libelle text-[10.5px] tracking-[0.2em]">
              {fil.map((e, i) => (
                <span key={i}>
                  {i > 0 && " · "}
                  {e.href ? (
                    <Link href={e.href} className="text-texte-attenue hover:text-texte">
                      {e.libelle}
                    </Link>
                  ) : (
                    e.libelle
                  )}
                </span>
              ))}
            </nav>
          ) : (
            surtitre && <span className="libelle text-[10.5px] tracking-[0.2em]">{surtitre}</span>
          )}
          <h1 className="m-0 titre text-2xl font-semibold">{titre}</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Cloche notifications={d.notifications} />
        <div className="flex items-center gap-3 rounded-full border border-[var(--bp-trait-8)] bg-[var(--bp-voile-4)] py-1.5 pr-3.5 pl-1.5">
          <Avatar nom={nom} url={compte.avatarUrl} anneau />
          <span className="flex flex-col gap-[3px]">
            <span className="text-sm font-bold">
              {nom}
              {compte.pseudo && (
                <span className="font-medium text-texte-attenue"> @{compte.pseudo}</span>
              )}
            </span>
            <Statut
              ton={compte.role === "ADMIN" ? "or" : compte.role === "FISC" ? "attenue" : "ok"}
              className="h-5 self-start text-[10.5px]"
            >
              {LIBELLES_ROLE[compte.role]}
            </Statut>
          </span>
        </div>
      </div>
    </GlassCard>
  );
}
