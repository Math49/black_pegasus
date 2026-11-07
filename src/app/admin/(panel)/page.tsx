import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { redirect } from "next/navigation";
import { nomCompte } from "@/domaine/comptes";
import { pageAccueilPanel, peut } from "@/domaine/permissions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { RecettesSemaines } from "@/composants/admin/tableau/RecettesSemaines";
import { Avatar } from "@/composants/ui/Avatar";
import { Button } from "@/composants/ui/Button";
import { DataGrid } from "@/composants/ui/DataGrid";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Kpi } from "@/composants/ui/Kpi";
import { Statut } from "@/composants/ui/Statut";
import { formaterDollars } from "@/domaine/argent";
import {
  impotsReglees,
  recettesParSemaine,
  syntheseParFiliale,
  variationPourcent,
} from "@/domaine/comptabilite";
import { libelleFiliale, SLUGS_FILIALE } from "@/domaine/filiales";
import { echeance, formaterRetourPrevu } from "@/domaine/contrats";
import { formaterDateLongue, salutation, versHeureServeur } from "@/domaine/dates";
import { semainePrecedente, type SemaineFiscale } from "@/domaine/semaine";
import { evolutionSolde } from "@/domaine/solde";
import { exigerSession } from "@/lib/garde";
import { lireContrats } from "@/services/contrats";
import { lireDonneesPanel } from "@/services/panel";
import { lireMouvementsDesSemaines, lireSyntheseSolde } from "@/services/solde";

export const metadata: Metadata = { title: "Tableau de bord" };

const SEMAINES_GRAPHIQUE = 8;

async function Contenu() {
  const [compte, d] = await Promise.all([exigerSession(), lireDonneesPanel()]);
  if (!peut(compte.role, "tableauDeBord.consulter")) redirect(pageAccueilPanel(compte.role));
  const [s, contrats] = await Promise.all([
    lireSyntheseSolde(d.maintenant, d.fuseau),
    lireContrats(),
  ]);
  const { courante, synthese: syn } = s;

  // Fenêtre du graphique : les 8 semaines qui finissent par la semaine en cours.
  const fenetre: SemaineFiscale[] = [courante];
  while (fenetre.length < SEMAINES_GRAPHIQUE)
    fenetre.unshift(semainePrecedente(fenetre[0], d.fuseau));
  const registres = await lireMouvementsDesSemaines(fenetre.map((w) => w.id));
  const recettes = recettesParSemaine(registres, fenetre);
  const precedente = recettes.at(-2)!;
  const variation = variationPourcent(syn.recettes, precedente.recettes);

  const enCours = contrats.filter((c) => c.statut === "EN_COURS");
  const retards = enCours.filter(
    (c) => echeance(c.finPrevue, d.maintenant, d.fuseau).enRetard,
  ).length;
  const evolution = evolutionSolde(s.soldeOuverture, s.solde);
  const impots = impotsReglees(s.mouvements);
  // Recettes de la semaine par filiale (le Groupe n'encaisse pas de recettes).
  const parFiliale = syntheseParFiliale(s.mouvements).filter((l) => l.filiale !== null);
  const maxFiliale = Math.max(1, ...parFiliale.map((l) => l.recettes));

  const prenom = nomCompte(compte).split(/\s+/)[0];
  const date = formaterDateLongue(d.maintenant, d.fuseau);
  const lundi = format(versHeureServeur(courante.debut, d.fuseau), "dd/MM");

  return (
    <>
      <EnTetePanel
        surtitre={date.charAt(0).toUpperCase() + date.slice(1)}
        titre={`${salutation(d.maintenant, d.fuseau)}${prenom ? `, ${prenom}` : ""}`}
      />

      <GlassCard
        as="section"
        variante="admin"
        aria-label="Solde de l’entreprise"
        className="relative flex flex-wrap items-end justify-between gap-6 overflow-hidden rounded-[24px] px-8 py-[30px]"
      >
        <svg
          viewBox="0 0 400 400"
          aria-hidden="true"
          className="pointer-events-none absolute -top-[170px] -right-[60px] h-[420px] w-[420px]"
        >
          <defs>
            <linearGradient id="arc-solde" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="var(--bp-gold-2)" stopOpacity=".7" />
              <stop offset="1" stopColor="var(--bp-gold-1)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <circle cx="200" cy="200" r="196" fill="none" stroke="url(#arc-solde)" strokeWidth="1" />
          <circle
            cx="200"
            cy="200"
            r="160"
            fill="none"
            stroke="url(#arc-solde)"
            strokeWidth=".6"
            opacity=".5"
          />
        </svg>
        <div className="flex flex-col gap-3">
          <span className="libelle text-[10.5px] tracking-[0.2em]">Solde de l’entreprise</span>
          <span className="texte-or text-[68px] leading-none font-extrabold tracking-[-0.02em] chiffres max-sm:text-[48px]">
            {formaterDollars(s.solde)}
          </span>
          <span className="flex flex-wrap items-center gap-2.5 text-sm text-texte-doux">
            <Statut ton="ok" icone={evolution.hausse ? "hausse" : "baisse"}>
              {evolution.libelle}
            </Statut>
            depuis lundi {lundi} (ouverture : {formaterDollars(s.soldeOuverture)})
          </span>
        </div>
        <div className="relative flex flex-wrap gap-2.5">
          <Button href="/admin/solde?nouveau=1" variante="verre" taille="panel" icone="plus">
            Nouveau mouvement
          </Button>
          <Button href="/admin/contrats/nouveau" taille="panel" icone="plus">
            Nouveau contrat
          </Button>
        </div>
      </GlassCard>

      <section
        aria-label="Indicateurs de la semaine"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4"
      >
        <Kpi
          libelle={`Chiffre d’affaires · S${courante.numero}`}
          icone="hausse"
          iconeOr
          valeur={formaterDollars(syn.recettes)}
          contexte={`${variation ? `${variation} vs S${precedente.numero} · ` : ""}toutes filiales`}
        />
        <Kpi
          libelle={`Dépenses · S${courante.numero}`}
          icone="baisse"
          valeur={formaterDollars(syn.depenses)}
          contexte={
            impots > 0
              ? `dont impôts S${precedente.numero} : ${formaterDollars(impots)}`
              : "aucun impôt réglé cette semaine"
          }
        />
        <Kpi
          libelle="Contrats en cours"
          icone="contrat"
          valeur={enCours.length}
          contexte={
            retards > 0 ? (
              <Statut ton="alerte" icone="alerte">
                {retards} en retard
              </Statut>
            ) : (
              "Aucun retard"
            )
          }
        />
        <Kpi
          libelle="Cautions détenues"
          icone="bouclier"
          valeur={formaterDollars(s.cautionsDetenues)}
          contexte="À restituer · hors recettes"
        />
      </section>

      <section className="flex flex-wrap items-stretch gap-5">
        <GlassCard
          as="section"
          variante="admin"
          aria-labelledby="titre-contrats"
          className="flex min-w-0 flex-[999_1_560px] flex-col gap-2.5 rounded-[24px] px-2 pt-[22px] pb-2.5"
        >
          <div className="flex items-center justify-between px-3.5">
            <h2 id="titre-contrats" className="m-0 titre text-lg font-semibold">
              Contrats en cours
            </h2>
            <Link
              href="/admin/contrats"
              className="flex min-h-11 items-center text-[13px] font-bold text-texte-doux hover:text-texte"
            >
              Tout voir
            </Link>
          </div>
          <div className="overflow-x-auto">
            <DataGrid
              libelle="Contrats en cours"
              className="min-w-[640px]"
              hauteurLigne={63}
              vide="Aucun contrat en cours."
              colonnes={[
                { cle: "client", titre: "Client", largeur: "minmax(140px,1.2fr)" },
                { cle: "vehicule", titre: "Véhicule", largeur: "minmax(110px,1fr)" },
                { cle: "retour", titre: "Retour prévu", largeur: "100px" },
                { cle: "statut", titre: "Statut", largeur: "140px" },
                { cle: "caution", titre: "Caution", largeur: "76px", alignement: "droite" },
                {
                  cle: "action",
                  titre: "Action",
                  largeur: "96px",
                  titreMasque: true,
                  alignement: "droite",
                },
              ]}
              lignes={enCours.map((c) => {
                const e = echeance(c.finPrevue, d.maintenant, d.fuseau);
                return {
                  cle: c.id,
                  ton: e.enRetard ? ("alerte" as const) : undefined,
                  cellules: {
                    client: (
                      <span className="flex items-center gap-2.5">
                        <Avatar nom={c.clientNom} taille={32} />
                        <span className="flex flex-col gap-0.5">
                          <span className="font-bold whitespace-nowrap">{c.clientNom}</span>
                          <span className="text-xs chiffres text-texte-attenue">
                            {c.clientTelephone}
                          </span>
                        </span>
                      </span>
                    ),
                    vehicule: (
                      <span className="flex flex-col gap-0.5">
                        <span className="whitespace-nowrap">{c.vehiculeNom}</span>
                        <span className="text-xs text-texte-attenue">
                          {c.exemplaire.immatriculation}
                        </span>
                      </span>
                    ),
                    retour: (
                      <span className="font-bold chiffres whitespace-nowrap">
                        {formaterRetourPrevu(c.finPrevue, d.maintenant, d.fuseau)}
                      </span>
                    ),
                    statut: (
                      <Statut
                        ton={e.ton}
                        icone={e.enRetard ? "alerte" : e.ton === "ok" ? "horloge" : undefined}
                      >
                        {e.libelle}
                      </Statut>
                    ),
                    caution: <span className="chiffres">{formaterDollars(c.caution)}</span>,
                    action: (
                      <Button
                        href={`/admin/contrats/${c.id}/cloturer`}
                        variante="verre"
                        taille="panel-petit"
                      >
                        Clôturer
                      </Button>
                    ),
                  },
                };
              })}
            />
          </div>
        </GlassCard>

        <GlassCard
          as="section"
          variante="admin"
          aria-labelledby="titre-recettes"
          className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px] rounded-[24px] px-6 py-[22px]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 id="titre-recettes" className="m-0 titre text-lg font-semibold">
                Recettes · {SEMAINES_GRAPHIQUE} semaines
              </h2>
              <span className="text-[13px] text-texte-attenue">Toutes filiales, hors cautions</span>
            </div>
            {variation && <Statut ton="ok">{variation}</Statut>}
          </div>
          <RecettesSemaines semaines={recettes} />
          <div className="flex flex-col gap-2.5">
            <h3 className="m-0 libelle text-[10.5px] tracking-[0.2em]">
              S{courante.numero} par filiale
            </h3>
            <ul
              aria-label="Recettes de la semaine par filiale"
              className="m-0 flex list-none flex-col gap-2 p-0"
            >
              {parFiliale.map((l) => (
                <li
                  key={l.filiale}
                  data-filiale={SLUGS_FILIALE[l.filiale!]}
                  className="grid grid-cols-[88px_minmax(0,1fr)_96px] items-center gap-3 text-[13px]"
                >
                  <span className="font-bold text-or-texte">{libelleFiliale(l.filiale)}</span>
                  <span
                    aria-hidden="true"
                    className="h-1.5 overflow-hidden rounded-full bg-[var(--bp-voile-6)]"
                  >
                    <span
                      className="block h-full rounded-full fond-or"
                      style={{ width: `${Math.max(0, (l.recettes / maxFiliale) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right font-bold chiffres">
                    {formaterDollars(l.recettes)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <span className="text-[12.5px] text-texte-attenue">
            S{courante.numero} en cours, arrêtée au{" "}
            {format(versHeureServeur(d.maintenant, d.fuseau), "EEEE dd/MM 'à' HH:mm", {
              locale: fr,
            })}
            .
          </span>
        </GlassCard>
      </section>
    </>
  );
}

export default function PageTableauDeBord() {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu />
    </Suspense>
  );
}
