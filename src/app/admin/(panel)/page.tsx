import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { redirect } from "next/navigation";
import { nomCompte } from "@/domaine/comptes";
import { pageAccueilPanel, peut } from "@/domaine/permissions";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { RecettesSemaines } from "@/composants/admin/tableau/RecettesSemaines";
import { Avatar } from "@/composants/ui/Avatar";
import { Button } from "@/composants/ui/Button";
import { CompteARebours } from "@/composants/ui/CompteARebours";
import { finInitiale } from "@/domaine/encheres";
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
import { LIBELLES_FILIALE, libelleFiliale, SLUGS_FILIALE } from "@/domaine/filiales";
import { echeance, formaterRetourPrevu } from "@/domaine/contrats";
import {
  formaterDateLongue,
  formaterHeure,
  formaterJourCourt,
  salutation,
  versHeureServeur,
} from "@/domaine/dates";
import { semainePrecedente, type SemaineFiscale } from "@/domaine/semaine";
import { evolutionSolde } from "@/domaine/solde";
import { exigerSession } from "@/lib/garde";
import { lireContrats } from "@/services/contrats";
import { lireDonneesPanel } from "@/services/panel";
import { lireMouvementsDesSemaines, lireSyntheseSolde } from "@/services/solde";
import {
  lireActiviteCards,
  lireDernieresDemandes,
  lireIdentitesFiliales,
} from "@/services/tableau";
import type { CodeFiliale } from "@/domaine/types";

export const metadata: Metadata = { title: "Tableau de bord" };

const SEMAINES_GRAPHIQUE = 8;

type Identite = { code: CodeFiliale; nom: string; logo: string };

/** En-tête d'un bloc de filiale : logo, nom, résumé et lien vers sa section. */
function EnTeteFiliale({
  identite,
  code,
  idTitre,
  resume,
  lien,
}: {
  identite?: Identite;
  code: CodeFiliale;
  idTitre: string;
  resume?: React.ReactNode;
  lien: { href: string; libelle: string };
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {identite?.logo && (
          <Image
            src={identite.logo}
            alt=""
            width={40}
            height={40}
            className="size-10 rounded-full bg-noir object-contain ring-1 ring-[var(--bp-or-35)]"
          />
        )}
        <div className="flex flex-col gap-0.5">
          <span className="libelle text-[10.5px] tracking-[0.2em]">Filiale</span>
          <h2 id={idTitre} className="m-0 titre text-lg font-semibold">
            {LIBELLES_FILIALE[code]}
          </h2>
        </div>
        {resume}
      </div>
      <Link
        href={lien.href}
        className="flex min-h-11 items-center text-[13px] font-bold text-texte-doux hover:text-texte"
      >
        {lien.libelle}
      </Link>
    </div>
  );
}

/** Petit chiffre d'un bloc de filiale. */
function Chiffre({
  libelle,
  valeur,
  detail,
}: {
  libelle: string;
  valeur: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-4)] px-4 py-3">
      <dt className="libelle text-[10px] tracking-[0.18em]">{libelle}</dt>
      <dd className="m-0 text-2xl font-extrabold chiffres">{valeur}</dd>
      {detail && <dd className="m-0 text-xs text-texte-attenue">{detail}</dd>}
    </div>
  );
}

async function Contenu() {
  const [compte, d] = await Promise.all([exigerSession(), lireDonneesPanel()]);
  if (!peut(compte.role, "tableauDeBord.consulter")) redirect(pageAccueilPanel(compte.role));
  const voitLocation = peut(compte.role, "contrat.consulter");
  const voitFormation = peut(compte.role, "demande.consulter");
  const voitCards = peut(compte.role, "cards.gerer");
  const [s, contrats, identites, demandes] = await Promise.all([
    lireSyntheseSolde(d.maintenant, d.fuseau),
    voitLocation ? lireContrats() : Promise.resolve([]),
    lireIdentitesFiliales(),
    voitFormation ? lireDernieresDemandes() : Promise.resolve([]),
  ]);
  const { courante, synthese: syn } = s;
  const cards = voitCards ? await lireActiviteCards(courante, d.maintenant) : null;
  const identite = (code: CodeFiliale) => identites.find((f) => f.code === code);

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
  const recettesDe = (code: CodeFiliale) =>
    parFiliale.find((l) => l.filiale === code)?.recettes ?? 0;

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
          {peut(compte.role, "contrat.creer") && (
            <Button href="/admin/contrats/nouveau" variante="verre" taille="panel" icone="plus">
              Nouveau contrat
            </Button>
          )}
          {peut(compte.role, "vente.creer") && (
            <Button
              href="/admin/cards/ventes?nouvelle=1"
              variante="verre"
              taille="panel"
              icone="plus"
            >
              Nouvelle vente
            </Button>
          )}
          {peut(compte.role, "mouvement.creer") && (
            <Button href="/admin/solde?nouveau=1" taille="panel" icone="plus">
              Nouveau mouvement
            </Button>
          )}
        </div>
      </GlassCard>

      <section
        aria-label="Indicateurs de la semaine"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-4"
      >
        <Kpi
          libelle={`Recettes · S${courante.numero}`}
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
          libelle={
            syn.impotDu !== null
              ? `Impôt estimé · S${courante.numero}`
              : `Résultat imposable · S${courante.numero}`
          }
          icone="balance"
          iconeOr
          valeur={formaterDollars(syn.impotDu ?? syn.baseImposable)}
          contexte={
            syn.impotDu !== null
              ? `${syn.tauxImpot} % des recettes · toutes filiales`
              : "Recettes − dépenses · toutes filiales"
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
          aria-labelledby="titre-recettes"
          className="flex min-w-0 flex-[1_1_440px] flex-col gap-[18px] rounded-[24px] px-6 py-[22px]"
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
        <div className="flex min-w-0 flex-[1_1_440px] flex-col gap-5">
          {voitFormation && (
            <GlassCard
              as="section"
              variante="admin"
              aria-labelledby="titre-formation"
              className="flex flex-col gap-4 rounded-[24px] px-6 py-[22px]"
            >
              <EnTeteFiliale
                identite={identite("BPF")}
                code="BPF"
                idTitre="titre-formation"
                lien={{ href: "/admin/formation/demandes", libelle: "Toutes les demandes" }}
              />
              <dl className="m-0 flex flex-wrap gap-3">
                <Chiffre libelle="Nouvelles demandes" valeur={d.demandesNouvelles} />
                <Chiffre
                  libelle={`Recettes · S${courante.numero}`}
                  valeur={formaterDollars(recettesDe("BPF"))}
                />
              </dl>
              {demandes.length > 0 ? (
                <ul aria-label="Dernières demandes" className="m-0 flex list-none flex-col p-0">
                  {demandes.map((dm) => (
                    <li
                      key={dm.id}
                      className="flex items-center justify-between gap-3 border-t border-[var(--bp-trait-8)] py-2.5 text-[13px]"
                    >
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate font-bold">{dm.nomRp}</span>
                        <span className="truncate text-xs text-texte-attenue">
                          {dm.permis?.nom ?? "Sans permis précisé"}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs chiffres text-texte-attenue">
                        {formaterJourCourt(dm.creeLe, d.fuseau)} ·{" "}
                        {formaterHeure(dm.creeLe, d.fuseau)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="m-0 text-[13px] text-texte-attenue">Aucune nouvelle demande.</p>
              )}
            </GlassCard>
          )}
          {cards && (
            <GlassCard
              as="section"
              variante="admin"
              aria-labelledby="titre-cards"
              className="flex flex-col gap-4 rounded-[24px] px-6 py-[22px]"
            >
              <EnTeteFiliale
                identite={identite("BPC")}
                code="BPC"
                idTitre="titre-cards"
                lien={{ href: "/admin/cards/ventes", libelle: "Toutes les ventes" }}
              />
              <dl className="m-0 flex flex-wrap gap-3">
                <Chiffre libelle={`Ventes · S${courante.numero}`} valeur={cards.ventes} />
                <Chiffre
                  libelle={`Recettes · S${courante.numero}`}
                  valeur={formaterDollars(recettesDe("BPC"))}
                />
                <Chiffre
                  libelle="Enchères en cours"
                  valeur={cards.encheres.length}
                  detail={
                    cards.encheres[0] ? (
                      <>
                        {cards.encheres[0].carte.nom} · fin dans{" "}
                        <CompteARebours
                          fin={cards.encheres[0].finPrevue.toISOString()}
                          finDuree={finInitiale(
                            cards.encheres[0].debut,
                            cards.encheres[0].dureeHeures,
                          ).toISOString()}
                          maintenant={d.maintenant.toISOString()}
                        />
                      </>
                    ) : (
                      "Aucune"
                    )
                  }
                />
                <Chiffre
                  libelle="Cartes épuisées"
                  valeur={cards.epuisees}
                  detail={`sur ${cards.cartes} carte${cards.cartes > 1 ? "s" : ""}`}
                />
              </dl>
              <Link
                href="/admin/cards"
                className="flex min-h-11 items-center self-start text-[13px] font-bold text-texte-doux hover:text-texte"
              >
                Gérer le catalogue
              </Link>
            </GlassCard>
          )}
        </div>
      </section>

      {voitLocation && (
        <GlassCard
          as="section"
          variante="admin"
          aria-labelledby="titre-location"
          className="flex w-full min-w-0 flex-col gap-2.5 rounded-[24px] px-2 pt-[22px] pb-2.5"
        >
          <div className="flex flex-col gap-4 px-3.5">
            <EnTeteFiliale
              identite={identite("BPL")}
              code="BPL"
              idTitre="titre-location"
              lien={{ href: "/admin/contrats", libelle: "Tous les contrats" }}
              resume={
                retards > 0 ? (
                  <Statut ton="alerte" icone="alerte">
                    {retards} en retard
                  </Statut>
                ) : undefined
              }
            />
            <dl className="m-0 flex flex-wrap gap-3">
              <Chiffre libelle="Contrats en cours" valeur={enCours.length} />
              <Chiffre
                libelle={`Recettes · S${courante.numero}`}
                valeur={formaterDollars(recettesDe("BPL"))}
              />
            </dl>
            <h3 className="m-0 libelle text-[10.5px] tracking-[0.2em]">Contrats en cours</h3>
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
      )}
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
