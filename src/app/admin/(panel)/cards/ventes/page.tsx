import { Suspense } from "react";
import Link from "next/link";
import { exigerPermission } from "@/lib/garde";
import { peut } from "@/domaine/permissions";
import { formaterDollars } from "@/domaine/argent";
import { resumeLignes } from "@/domaine/cards";
import { formaterDateLongue } from "@/domaine/dates";
import { nomCompte } from "@/domaine/comptes";
import { lireCartesVendables, lireVentes, TAILLE_PAGE_VENTES } from "@/services/cards";
import { lireParametresSite } from "@/services/site";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { AnnulerVente, NouvelleVente } from "@/composants/admin/cards/GestionVentes";
import { DataGrid } from "@/composants/ui/DataGrid";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Statut } from "@/composants/ui/Statut";

export const metadata = { title: "Ventes de cartes" };

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/cards/ventes">["searchParams"];
}) {
  const compte = await exigerPermission("vente.consulter");
  const params = await searchParams;
  const numero = Number(params.page);
  const q = typeof params.q === "string" ? params.q.slice(0, 100) : "";
  const peutCreer = peut(compte.role, "vente.creer");
  const peutAnnuler = peut(compte.role, "vente.annuler");
  const [{ ventes, total, pageCourante }, cartes, p] = await Promise.all([
    lireVentes(Number.isSafeInteger(numero) ? numero : 1, q),
    peutCreer ? lireCartesVendables() : Promise.resolve([]),
    lireParametresSite(),
  ]);
  return (
    <>
      <EnTetePanel titre="Ventes de cartes" fil={[{ libelle: "Cards" }, { libelle: "Ventes" }]} />
      <GlassCard
        as="section"
        variante="admin"
        aria-label="Registre des ventes"
        className="flex min-w-0 flex-col gap-5 p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="m-0 max-w-[640px] text-sm text-texte-doux">
            {total} vente{total > 1 ? "s" : ""} · chaque vente inscrit sa recette au registre
            (catégorie Vente de cartes, filiale Cards).
            {!peutCreer && " Consultation seule."}
          </p>
          {q && (
            <p className="m-0 flex items-center gap-3 text-sm">
              Recherche : « {q} »
              <Link className="bp-nav-lien" href="/admin/cards/ventes">
                Toutes les ventes
              </Link>
            </p>
          )}
          {peutCreer && <NouvelleVente cartes={cartes} ouvertInitial={params.nouvelle === "1"} />}
        </div>
        <DataGrid
          libelle="Ventes de cartes"
          vide="Aucune vente enregistrée."
          colonnes={[
            { cle: "numero", titre: "N°", largeur: "126px" },
            { cle: "date", titre: "Date", largeur: "minmax(140px,1fr)" },
            { cle: "carte", titre: "Cartes", largeur: "minmax(160px,1.6fr)" },
            { cle: "quantite", titre: "Ex.", largeur: "52px", alignement: "droite" },
            { cle: "montant", titre: "Encaissé", largeur: "120px", alignement: "droite" },
            { cle: "client", titre: "Client", largeur: "minmax(120px,1fr)" },
            { cle: "saisie", titre: "Saisie par", largeur: "minmax(110px,1fr)" },
            { cle: "statut", titre: "Statut", largeur: "112px" },
            ...(peutAnnuler
              ? [{ cle: "actions" as const, titre: "Actions", largeur: "112px", titreMasque: true }]
              : []),
          ]}
          lignes={ventes.map((v) => {
            const cloturee = v.mouvements.some((m) => m.semaine.statut === "CLOTUREE");
            return {
              cle: v.id,
              ton: v.statut === "ANNULEE" ? ("inactif" as const) : undefined,
              cellules: {
                numero: <span className="font-bold chiffres">{v.numero}</span>,
                date: formaterDateLongue(v.date, p.fuseauServeur),
                carte: resumeLignes(v.lignes),
                quantite: (
                  <span className="chiffres">{v.lignes.reduce((t, l) => t + l.quantite, 0)}</span>
                ),
                montant: (
                  <span className="flex flex-col items-end gap-0.5">
                    <span className="font-bold chiffres">{formaterDollars(v.montant)}</span>
                    {v.remise > 0 && (
                      <span className="text-xs chiffres text-texte-attenue">
                        remise {formaterDollars(v.remise)}
                      </span>
                    )}
                  </span>
                ),
                client: (
                  <span className="flex flex-col gap-1">
                    <span>{v.clientNom}</span>
                    {v.clientTelephone && (
                      <span className="text-xs text-texte-doux">{v.clientTelephone}</span>
                    )}
                  </span>
                ),
                saisie: nomCompte(v.saisiePar),
                statut:
                  v.statut === "ANNULEE" ? (
                    <Statut ton="attenue" icone="fermer">
                      Annulée
                    </Statut>
                  ) : (
                    <Statut ton="ok" point>
                      Validée
                    </Statut>
                  ),
                actions:
                  v.statut === "VALIDEE" && !cloturee ? <AnnulerVente vente={v} /> : undefined,
              },
            };
          })}
        />
        {total > TAILLE_PAGE_VENTES && (
          <nav aria-label="Pages des ventes" className="flex justify-between gap-4">
            {pageCourante > 1 && (
              <Link
                className="bp-nav-lien"
                href={`/admin/cards/ventes?page=${pageCourante - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              >
                Page précédente
              </Link>
            )}
            {pageCourante * TAILLE_PAGE_VENTES < total && (
              <Link
                className="bp-nav-lien ml-auto"
                href={`/admin/cards/ventes?page=${pageCourante + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              >
                Page suivante
              </Link>
            )}
          </nav>
        )}
      </GlassCard>
    </>
  );
}

export default function PageVentes({ searchParams }: PageProps<"/admin/cards/ventes">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
