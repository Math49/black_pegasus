import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { Avatar } from "@/composants/ui/Avatar";
import { Button, IconButton } from "@/composants/ui/Button";
import { DataGrid } from "@/composants/ui/DataGrid";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon } from "@/composants/ui/Icon";
import { Seg } from "@/composants/ui/Seg";
import { Statut } from "@/composants/ui/Statut";
import { formaterDollars } from "@/domaine/argent";
import { echeance, formaterJourHeure } from "@/domaine/contrats";
import { contientInstant, semaineDe } from "@/domaine/semaine";
import { peut } from "@/domaine/permissions";
import { exigerPermission } from "@/lib/garde";
import { lireContrats } from "@/services/contrats";
import { lireDonneesPanel } from "@/services/panel";

export const metadata: Metadata = { title: "Contrats" };

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/contrats">["searchParams"];
}) {
  const compte = await exigerPermission("contrat.consulter");
  const peutCreer = peut(compte.role, "contrat.creer");
  const peutCloturer = peut(compte.role, "contrat.cloturer");
  const params = await searchParams;
  const onglet = params.onglet === "termines" ? "termines" : "en-cours";
  const q = String(params.q ?? "").trim();
  const cree = typeof params.cree === "string" ? params.cree : null;
  const [tous, d] = await Promise.all([lireContrats(), lireDonneesPanel()]);
  const semaine = semaineDe(d.maintenant, d.fuseau);

  const enCours = tous.filter((c) => c.statut === "EN_COURS");
  const termines = tous
    .filter((c) => c.statut !== "EN_COURS")
    .sort((a, b) => (b.retourReel ?? b.creeLe).getTime() - (a.retourReel ?? a.creeLe).getTime());
  const terminesSemaine = termines.filter(
    (c) => c.retourReel && contientInstant(semaine, c.retourReel),
  ).length;
  const recherche = q.toLowerCase();
  const affiches = (onglet === "en-cours" ? enCours : termines).filter(
    (c) =>
      !recherche ||
      [c.numero, c.clientNom, c.clientTelephone, c.vehiculeNom, c.exemplaire.immatriculation].some(
        (x) => x.toLowerCase().includes(recherche),
      ),
  );
  const cautions = enCours.reduce((t, c) => t + c.caution, 0);
  const lien = (o: string) =>
    `/admin/contrats?onglet=${o}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <EnTetePanel titre="Contrats" fil={[{ libelle: "Location" }, { libelle: "Contrats" }]} />

      {cree && (
        <GlassCard
          variante="admin"
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-5 py-3.5"
        >
          <span className="flex items-center gap-3 text-sm">
            <Icon nom="valider" className="text-or-icone" />
            Contrat <strong>{cree}</strong> créé : location et caution inscrites au solde.
          </span>
          {tous.find((c) => c.numero === cree) && (
            <Button
              href={`/admin/contrats/${tous.find((c) => c.numero === cree)!.id}/pdf`}
              prefetch={false}
              target="_blank"
              variante="verre"
              taille="panel-petit"
              icone="pdf"
            >
              Ouvrir le PDF du contrat
            </Button>
          )}
        </GlassCard>
      )}

      <GlassCard
        as="section"
        variante="admin"
        aria-label="Liste des contrats"
        className="flex flex-col gap-4 rounded-[24px] px-2 pt-5 pb-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3.5 px-3.5">
          <Seg
            libelle="État des contrats"
            valeur={onglet}
            options={[
              {
                valeur: "en-cours",
                libelle: "En cours",
                compteur: enCours.length,
                href: lien("en-cours"),
              },
              {
                valeur: "termines",
                libelle: "Terminés",
                compteur: `${terminesSemaine} cette semaine`,
                href: lien("termines"),
              },
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <form role="search" action="/admin/contrats" className="bp-champ-cadre w-[280px]">
              <input type="hidden" name="onglet" value={onglet} />
              <Icon nom="recherche" taille={15} />
              <input
                type="search"
                name="q"
                defaultValue={q}
                aria-label="Rechercher un contrat"
                placeholder="N°, client, téléphone, véhicule…"
                className="bp-fld bp-fld--panel bp-fld--avec-icone h-11"
              />
            </form>
            {peutCreer && (
              <Button href="/admin/contrats/nouveau" taille="panel" icone="plus">
                Nouveau contrat
              </Button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <DataGrid
            libelle={onglet === "en-cours" ? "Contrats en cours" : "Contrats terminés"}
            className="min-w-[1080px]"
            hauteurLigne={70}
            vide={
              q
                ? "Aucun contrat ne correspond."
                : onglet === "en-cours"
                  ? "Aucun contrat en cours."
                  : "Aucun contrat terminé."
            }
            colonnes={[
              { cle: "numero", titre: "N° contrat", largeur: "112px" },
              { cle: "client", titre: "Client", largeur: "minmax(150px,1.2fr)" },
              { cle: "vehicule", titre: "Véhicule", largeur: "minmax(120px,1fr)" },
              {
                cle: "periode",
                titre: onglet === "en-cours" ? "Début → retour prévu" : "Début → retour réel",
                largeur: "152px",
              },
              { cle: "location", titre: "Location", largeur: "76px", alignement: "droite" },
              { cle: "caution", titre: "Caution", largeur: "76px", alignement: "droite" },
              { cle: "statut", titre: "Statut", largeur: "128px" },
              { cle: "actions", titre: "Actions", largeur: "124px", titreMasque: true },
            ]}
            lignes={affiches.map((c) => {
              const e = echeance(c.finPrevue, d.maintenant, d.fuseau);
              const statut =
                c.statut === "EN_COURS" ? (
                  <Statut ton={e.ton} icone={e.ton === "ok" ? "horloge" : undefined}>
                    {e.libelle}
                  </Statut>
                ) : c.statut === "ANNULE" ? (
                  <Statut>Annulé</Statut>
                ) : (c.retardMinutes ?? 0) > 0 ? (
                  <Statut ton="ok">Terminé · retard</Statut>
                ) : (
                  <Statut ton="ok">Terminé</Statut>
                );
              return {
                cle: c.id,
                ton:
                  e.enRetard && c.statut === "EN_COURS"
                    ? ("alerte" as const)
                    : c.statut === "ANNULE"
                      ? ("inactif" as const)
                      : undefined,
                cellules: {
                  numero: <span className="text-[13.5px] font-bold chiffres">{c.numero}</span>,
                  client: (
                    <span className="flex items-center gap-3">
                      <Avatar nom={c.clientNom} taille={32} />
                      <span className="flex flex-col gap-0.5">
                        <span className="font-bold">{c.clientNom}</span>
                        <span className="text-xs chiffres text-texte-attenue">
                          {c.clientTelephone}
                        </span>
                      </span>
                    </span>
                  ),
                  vehicule: (
                    <span className="flex flex-col gap-0.5">
                      <span>{c.vehiculeNom}</span>
                      <span className="text-xs text-texte-attenue">
                        {c.exemplaire.immatriculation}
                      </span>
                    </span>
                  ),
                  periode: (
                    <span className="flex flex-col gap-0.5 text-[12.5px]">
                      <span className="text-texte-attenue">
                        {formaterJourHeure(c.debut, d.fuseau)}
                      </span>
                      <span className="font-bold">
                        → {formaterJourHeure(c.retourReel ?? c.finPrevue, d.fuseau)}
                      </span>
                    </span>
                  ),
                  location: <span className="font-bold">{formaterDollars(c.montantLocation)}</span>,
                  caution: <span className="text-texte-doux">{formaterDollars(c.caution)}</span>,
                  statut,
                  actions: (
                    <span className="flex items-center justify-end gap-2">
                      <IconButton
                        href={`/admin/contrats/${c.id}/pdf`}
                        prefetch={false}
                        target="_blank"
                        libelle={`PDF du contrat ${c.numero}`}
                        icone="pdf"
                        taille="tableau"
                      />
                      {c.statut === "EN_COURS" && peutCloturer && (
                        <Button
                          href={`/admin/contrats/${c.id}/cloturer`}
                          variante="verre"
                          taille="panel-petit"
                        >
                          Clôturer
                        </Button>
                      )}
                    </span>
                  ),
                },
              };
            })}
          />
        </div>
        <div className="flex flex-wrap justify-between gap-3 px-3.5 pt-1 pb-1.5 text-[13px] text-texte-attenue">
          <span>
            {enCours.length} contrat{enCours.length > 1 ? "s" : ""} en cours ·{" "}
            {formaterDollars(cautions)} de cautions détenues
          </span>
          <span>Heure du serveur : {formaterJourHeure(d.maintenant, d.fuseau).toLowerCase()}</span>
        </div>
      </GlassCard>
    </>
  );
}

export default function PageContrats({ searchParams }: PageProps<"/admin/contrats">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
