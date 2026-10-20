import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ModaleAjoutCompte } from "@/composants/admin/comptes/ModaleAjoutCompte";
import { TableauComptes, type LigneCompte } from "@/composants/admin/comptes/TableauComptes";
import { DataGrid } from "@/composants/ui/DataGrid";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Statut } from "@/composants/ui/Statut";
import { formaterDerniereConnexion, nomCompte } from "@/domaine/comptes";
import { versHeureServeur } from "@/domaine/dates";
import { LIBELLES_ROLE } from "@/domaine/permissions";
import { exigerPermission } from "@/lib/garde";
import { LIBELLES_ACTIONS } from "@/services/audit";
import { lireComptes, lireJournal } from "@/services/comptes";
import { lireDonneesPanel } from "@/services/panel";
import type { Role } from "@/domaine/types";
import { format } from "date-fns";

export const metadata: Metadata = { title: "Comptes" };

/** Détails lisibles d'une ligne du journal. */
function detailsJournal(action: string, details: unknown): string {
  const d = (details ?? {}) as { nom?: string; role?: Role; avant?: Role; apres?: Role };
  const nom = d.nom ?? "";
  if (action === "compte.role" && d.avant && d.apres) {
    return `${nom} : ${LIBELLES_ROLE[d.avant]} → ${LIBELLES_ROLE[d.apres]}`;
  }
  if (action === "compte.ajouter" && d.role) return `${nom} · ${LIBELLES_ROLE[d.role]}`;
  return nom;
}

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/comptes">["searchParams"];
}) {
  const moi = await exigerPermission("compte.gerer");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [comptes, journal, d] = await Promise.all([
    lireComptes(),
    lireJournal(page),
    lireDonneesPanel(),
  ]);
  const date = (x: Date, motif: string) => format(versHeureServeur(x, d.fuseau), motif);

  const lignes: LigneCompte[] = comptes.map((c) => ({
    id: c.id,
    discordId: c.discordId,
    nom: nomCompte(c),
    pseudo: c.pseudo,
    avatarUrl: c.avatarUrl,
    role: c.role,
    actif: c.actif,
    ajouteLe: date(c.ajouteLe, "dd/MM/yyyy"),
    ajoutePar: c.ajoutePar ? nomCompte(c.ajoutePar) : "Fondateur",
    derniereConnexion: formaterDerniereConnexion(
      c.derniereConnexion,
      d.maintenant,
      d.fuseau,
      c.id === moi.id,
    ),
    estMoi: c.id === moi.id,
  }));
  const actifs = comptes.filter((c) => c.actif).length;

  return (
    <>
      <EnTetePanel
        titre="Comptes autorisés"
        fil={[{ libelle: "Administration" }, { libelle: "Comptes" }]}
      />

      <GlassCard
        as="section"
        variante="admin"
        aria-labelledby="titre-comptes"
        className="flex flex-col gap-3.5 px-2 pt-5 pb-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3.5 px-3.5">
          <div className="flex flex-col gap-1">
            <h2 id="titre-comptes" className="m-0 titre text-lg font-semibold">
              {comptes.length} comptes · {actifs} actif{actifs > 1 ? "s" : ""}
            </h2>
            <span className="text-[13px] text-texte-attenue">
              Seuls ces identifiants Discord peuvent ouvrir le panel.
            </span>
          </div>
          <ModaleAjoutCompte />
        </div>
        <TableauComptes comptes={lignes} />
      </GlassCard>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-5">
        <GlassCard variante="admin" className="flex flex-col gap-3 rounded-[24px] p-6">
          <Statut ton="or" className="self-start">
            Administrateur
          </Statut>
          <p className="m-0 text-sm leading-[1.6] text-texte-doux">
            Accès complet : gestion des comptes, clôture des semaines comptables, export de la
            déclaration au FISC, suppression de véhicules.
          </p>
        </GlassCard>
        <GlassCard variante="admin" className="flex flex-col gap-3 rounded-[24px] p-6">
          <Statut ton="ok" className="self-start">
            Gestionnaire
          </Statut>
          <p className="m-0 text-sm leading-[1.6] text-texte-doux">
            Contrats, véhicules et mouvements du solde. Ne peut ni clôturer une semaine, ni gérer
            les comptes.
          </p>
        </GlassCard>
      </div>

      <GlassCard
        as="section"
        variante="admin"
        aria-labelledby="titre-journal"
        className="flex flex-col gap-3.5 px-2 pt-5 pb-2.5"
      >
        <div className="flex flex-col gap-1 px-3.5">
          <h2 id="titre-journal" className="m-0 titre text-lg font-semibold">
            Journal d’activité
          </h2>
          <span className="text-[13px] text-texte-attenue">
            Chaque écriture du panel, avec son auteur. {journal.total} entrée
            {journal.total > 1 ? "s" : ""}.
          </span>
        </div>
        <div className="overflow-x-auto">
          <DataGrid
            libelle="Journal d’activité"
            className="min-w-[900px]"
            vide="Aucune activité enregistrée pour l’instant."
            colonnes={[
              { cle: "date", titre: "Date", largeur: "150px" },
              { cle: "auteur", titre: "Auteur", largeur: "180px" },
              { cle: "action", titre: "Action", largeur: "190px" },
              { cle: "cible", titre: "Cible", largeur: "minmax(160px,1fr)" },
              { cle: "details", titre: "Détails", largeur: "minmax(200px,1.4fr)" },
            ]}
            lignes={journal.lignes.map((l) => ({
              cle: l.id,
              cellules: {
                date: (
                  <span className="chiffres text-texte-doux">
                    {date(l.date, "dd/MM/yyyy HH:mm")}
                  </span>
                ),
                auteur: nomCompte(l.compte),
                action: LIBELLES_ACTIONS[l.action] ?? l.action,
                cible: <span className="text-[12.5px] chiffres text-texte-attenue">{l.cible}</span>,
                details: (
                  <span className="text-texte-doux">{detailsJournal(l.action, l.details)}</span>
                ),
              },
            }))}
          />
        </div>
        {journal.pages > 1 && (
          <nav
            aria-label="Pages du journal"
            className="flex items-center justify-end gap-2 px-3.5 pb-1"
          >
            {page > 1 && (
              <Link
                className="bp-btn bp-btn--verre bp-btn--panel-petit"
                href={`/admin/comptes?page=${page - 1}`}
              >
                Précédent
              </Link>
            )}
            <span className="text-[13px] text-texte-attenue">
              Page {page} / {journal.pages}
            </span>
            {page < journal.pages && (
              <Link
                className="bp-btn bp-btn--verre bp-btn--panel-petit"
                href={`/admin/comptes?page=${page + 1}`}
              >
                Suivant
              </Link>
            )}
          </nav>
        )}
      </GlassCard>
    </>
  );
}

export default function PageComptes({ searchParams }: PageProps<"/admin/comptes">) {
  return (
    <Suspense fallback={null}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
