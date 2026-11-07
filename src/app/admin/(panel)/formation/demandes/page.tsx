import { Suspense } from "react";
import Link from "next/link";
import { exigerPermission } from "@/lib/garde";
import { lireDemandes } from "@/services/formation";
import { lireParametresSite } from "@/services/site";
import { formaterDateLongue } from "@/domaine/dates";
import { nomCompte } from "@/domaine/comptes";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { GlassCard } from "@/composants/ui/GlassCard";
import { DataGrid } from "@/composants/ui/DataGrid";
import { TraiterDemande } from "@/composants/admin/formation/TraiterDemande";

export const metadata = { title: "Demandes de formation" };
async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/formation/demandes">["searchParams"];
}) {
  await exigerPermission("demande.consulter");
  const params = await searchParams;
  const toutes = params.statut === "toutes";
  const numero = Number(params.page);
  const [{ demandes, total, pageCourante }, p] = await Promise.all([
    lireDemandes(toutes, Number.isSafeInteger(numero) ? numero : 1),
    lireParametresSite(),
  ]);
  const base = `/admin/formation/demandes?statut=${toutes ? "toutes" : "nouvelles"}`;
  return (
    <>
      <EnTetePanel
        titre="Demandes de formation"
        fil={[{ libelle: "Formation" }, { libelle: "Demandes" }]}
      />
      <GlassCard
        as="section"
        variante="admin"
        aria-label="Boîte de réception"
        className="flex min-w-0 flex-col gap-5 p-5"
      >
        <nav aria-label="Statut des demandes" className="flex flex-wrap gap-3">
          <Link
            className="bp-nav-lien"
            href="/admin/formation/demandes"
            aria-current={!toutes ? "page" : undefined}
          >
            Nouvelles
          </Link>
          <Link
            className="bp-nav-lien"
            href="/admin/formation/demandes?statut=toutes"
            aria-current={toutes ? "page" : undefined}
          >
            Toutes
          </Link>
        </nav>
        <p className="m-0 text-sm text-texte-doux">
          {total} demande{total > 1 ? "s" : ""} · page {pageCourante}
        </p>
        <DataGrid
          libelle="Demandes de formation"
          vide="Aucune demande dans cette liste."
          colonnes={[
            { cle: "date", titre: "Date", largeur: "200px" },
            { cle: "contact", titre: "Contact en jeu", largeur: "180px" },
            { cle: "permis", titre: "Permis", largeur: "180px" },
            { cle: "message", titre: "Message", largeur: "minmax(260px,1fr)" },
            { cle: "statut", titre: "Statut", largeur: "240px" },
          ]}
          lignes={demandes.map((d) => ({
            cle: d.id,
            cellules: {
              date: formaterDateLongue(d.creeLe, p.fuseauServeur),
              contact: (
                <span className="flex flex-col gap-2">
                  <strong>{d.nomRp}</strong>
                  <span>{d.telephone}</span>
                </span>
              ),
              permis: d.permis?.nom ?? "Demande générale",
              message: <span className="block break-words whitespace-pre-wrap">{d.message}</span>,
              statut:
                d.statut === "NOUVELLE" ? (
                  <TraiterDemande id={d.id} nomRp={d.nomRp} />
                ) : (
                  <span className="flex flex-col gap-2">
                    <strong>Traitée</strong>
                    {d.traiteeLe && <span>{formaterDateLongue(d.traiteeLe, p.fuseauServeur)}</span>}
                    {d.traiteePar && <span>Par {nomCompte(d.traiteePar)}</span>}
                  </span>
                ),
            },
          }))}
        />
        {total > 30 && (
          <nav aria-label="Pages des demandes" className="flex justify-between gap-4">
            {pageCourante > 1 && (
              <Link className="bp-nav-lien" href={`${base}&page=${pageCourante - 1}`}>
                Page précédente
              </Link>
            )}
            {pageCourante * 30 < total && (
              <Link className="bp-nav-lien ml-auto" href={`${base}&page=${pageCourante + 1}`}>
                Page suivante
              </Link>
            )}
          </nav>
        )}
      </GlassCard>
    </>
  );
}
export default function PageDemandes({ searchParams }: PageProps<"/admin/formation/demandes">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
