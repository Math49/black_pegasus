import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ModaleCloture } from "@/composants/admin/comptabilite/ModaleCloture";
import { Button, IconButton } from "@/composants/ui/Button";
import { DataGrid } from "@/composants/ui/DataGrid";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon } from "@/composants/ui/Icon";
import { Seg } from "@/composants/ui/Seg";
import { Statut } from "@/composants/ui/Statut";
import { formaterDollars } from "@/domaine/argent";
import {
  colonneRegistre,
  compteursOnglets,
  filtrerRegistre,
  totauxRegistre,
  ventilation,
  type Controle,
  type OngletRegistre,
} from "@/domaine/comptabilite";
import { nomCompte } from "@/domaine/comptes";
import { versHeureServeur } from "@/domaine/dates";
import { numeroDeclaration, numeroOperationAffiche } from "@/domaine/numerotation";
import { peut } from "@/domaine/permissions";
import { semaineDe, semaineParId, semainePrecedente, semaineSuivante } from "@/domaine/semaine";
import { LIBELLES_CATEGORIE, mentionReport } from "@/domaine/solde";
import { cx } from "@/lib/classes";
import { exigerPermission } from "@/lib/garde";
import { lireBornesSemaines, lireEtatSemaine } from "@/services/comptabilite";
import { lireDonneesPanel } from "@/services/panel";

export const metadata: Metadata = { title: "Comptabilité" };

const ONGLETS: { valeur: OngletRegistre; libelle: string }[] = [
  { valeur: "toutes", libelle: "Toutes" },
  { valeur: "recettes", libelle: "Recettes" },
  { valeur: "depenses", libelle: "Dépenses" },
  { valeur: "cautions", libelle: "Cautions" },
];

function Carte({
  libelle,
  valeur,
  detail,
  ton,
}: {
  libelle: string;
  valeur: string;
  detail: string;
  ton?: "or" | "resultat" | "caution";
}) {
  return (
    <GlassCard
      variante="admin"
      className={cx(
        "flex flex-col gap-2.5 px-[22px] py-5",
        ton === "resultat" && "border-[var(--bp-or-45)] bg-[var(--bp-or-8)]",
        ton === "caution" && "border-dashed border-[var(--bp-argent-35)]",
      )}
    >
      <span
        className={cx(
          "libelle text-[10.5px] tracking-[0.2em]",
          ton === "resultat" && "text-or-texte",
        )}
      >
        {libelle}
      </span>
      <span
        className={cx(
          "leading-none font-extrabold chiffres",
          ton === "resultat" ? "texte-or text-[32px]" : "text-[28px]",
          ton === "or" && "text-or-texte",
          ton === "caution" && "text-argent-1",
        )}
      >
        {valeur}
      </span>
      <span className="text-[12.5px] text-texte-attenue">{detail}</span>
    </GlassCard>
  );
}

function LigneControle({ c, retards }: { c: Controle; retards: boolean }) {
  // Alerte réservée aux retards et aux contrôles bloquants (icône + texte).
  const alerte = c.niveau === "bloquant" || (c.cle === "contrats" && retards);
  return (
    <span className={cx("flex items-center gap-3 text-sm", alerte && "text-alerte-texte")}>
      <Icon
        nom={alerte ? "alerte" : c.niveau === "info" ? "information" : "valider"}
        taille={16}
        className={alerte ? undefined : c.niveau === "ok" ? "text-or-icone" : "text-argent-1"}
      />
      {c.message}
    </span>
  );
}

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/comptabilite">["searchParams"];
}) {
  const compte = await exigerPermission("comptabilite.consulter");
  const params = await searchParams;
  const d = await lireDonneesPanel();
  const courante = semaineDe(d.maintenant, d.fuseau);
  const premiere = await lireBornesSemaines();

  let semaine = courante;
  try {
    if (typeof params.semaine === "string") semaine = semaineParId(params.semaine, d.fuseau);
  } catch {
    // identifiant invalide : semaine courante
  }
  if (semaine.debut > courante.debut) semaine = courante;
  const etat = await lireEtatSemaine(semaine.id, d.maintenant, d.fuseau);
  const onglet = ONGLETS.some((o) => o.valeur === params.onglet)
    ? (params.onglet as OngletRegistre)
    : "toutes";
  const { synthese: syn, mouvements, statut } = etat;
  const cloturee = statut === "CLOTUREE";

  const precedente = semainePrecedente(semaine, d.fuseau);
  const aPrecedente = premiere ? precedente.id >= premiere.id : false;
  const aSuivante = semaine.id < courante.id;
  const lien = (id: string, o = onglet) =>
    `/admin/comptabilite?semaine=${id}${o !== "toutes" ? `&onglet=${o}` : ""}`;

  const quand = (date: Date, motif: string) =>
    format(versHeureServeur(date, d.fuseau), motif, { locale: fr });
  const dimanche = new Date(semaine.fin.getTime() - 1);
  const v = ventilation(mouvements);
  const compteurs = compteursOnglets(mouvements);
  const lignes = filtrerRegistre(mouvements, onglet);
  const totaux = totauxRegistre(lignes);
  const avecApports = mouvements.some((m) => m.categorie === "APPORT");
  const retards = etat.contratsEnCours.filter((c) => c.finPrevue < d.maintenant);
  const majuscule = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

  const controlesAffiches = etat.controles.filter((c) =>
    ["justificatifs", "numerotation", "solde", "contrats"].includes(c.cle),
  );
  const bloquants = etat.controles.filter((c) => c.niveau === "bloquant");

  const montant = (n: number, col: string) => (
    <span
      className={cx(
        "chiffres",
        col === "recette" && "font-extrabold text-or-texte",
        col === "depense" && "font-extrabold text-argent-1",
        (col === "caution" || col === "apport") && "font-bold text-texte-attenue",
      )}
    >
      {col === "depense" ? formaterDollars(-n) : formaterDollars(n, { signe: true })}
    </span>
  );

  return (
    <>
      <EnTetePanel
        titre="Comptabilité hebdomadaire"
        fil={[{ libelle: "Gestion" }, { libelle: "Comptabilité" }, { libelle: "FISC" }]}
      />

      <GlassCard
        as="section"
        variante="admin"
        aria-label="Semaine affichée"
        className="flex flex-wrap items-center justify-between gap-4 px-[18px] py-4"
      >
        <div className="flex flex-wrap items-center gap-3.5">
          {aPrecedente ? (
            <IconButton
              href={lien(precedente.id)}
              libelle="Semaine précédente"
              icone="chevronGauche"
            />
          ) : (
            <IconButton libelle="Semaine précédente" icone="chevronGauche" disabled />
          )}
          <div className="flex min-w-[300px] flex-col gap-1 max-sm:min-w-0">
            <h2 className="m-0 titre text-xl font-semibold">Semaine {semaine.numero}</h2>
            <span className="text-[13.5px] text-texte-attenue">
              Du {quand(semaine.debut, "EEEE d")} au {quand(dimanche, "EEEE d MMMM yyyy")}
            </span>
          </div>
          {aSuivante ? (
            <IconButton
              href={lien(semaineSuivante(semaine, d.fuseau).id)}
              libelle="Semaine suivante"
              icone="chevronDroite"
            />
          ) : (
            <IconButton libelle="Semaine suivante" icone="chevronDroite" disabled />
          )}
          <Statut ton={cloturee ? "or" : "ok"} icone={cloturee ? "cadenas" : "cadenasOuvert"}>
            {cloturee ? "Clôturée" : "Ouverte"}
          </Statut>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {peut(compte.role, "comptabilite.exporterCsv") && (
            <IconButton
              href={`/admin/comptabilite/${semaine.id}/csv`}
              prefetch={false}
              libelle={`Exporter le registre de la semaine ${semaine.numero} en CSV`}
              icone="telecharger"
            />
          )}
          {cloturee
            ? peut(compte.role, "declaration.exporter") && (
                <Button
                  href={`/admin/comptabilite/${semaine.id}/declaration`}
                  prefetch={false}
                  target="_blank"
                  taille="panel"
                  icone="pdf"
                >
                  Déclaration {numeroDeclaration(semaine.annee, semaine.numero)}
                </Button>
              )
            : peut(compte.role, "declaration.brouillon") && (
                <Button
                  href={`/admin/comptabilite/${semaine.id}/declaration`}
                  prefetch={false}
                  target="_blank"
                  variante="verre"
                  taille="panel"
                  icone="telecharger"
                >
                  Exporter un brouillon
                </Button>
              )}
          {!cloturee && peut(compte.role, "semaine.cloturer") && (
            <ModaleCloture
              semaineId={semaine.id}
              numero={semaine.numero}
              periode={`du ${quand(semaine.debut, "EEEE d")} au ${quand(dimanche, "EEEE d MMMM")}`}
              desactive={!etat.cloturable}
              raison={bloquants[0]?.message ?? null}
              resume={{
                operations: syn.nombreOperations,
                recettes: formaterDollars(syn.recettes),
                depenses: formaterDollars(syn.depenses),
                cautions: formaterDollars(syn.cautionsDetenues),
                resultat: formaterDollars(syn.resultatImposable),
              }}
              avertissement={
                etat.contratsEnCours.length > 0 ? (
                  <>
                    <strong className="text-texte">
                      {etat.contratsEnCours.length} contrat
                      {etat.contratsEnCours.length > 1 ? "s sont" : " est"} encore en cours
                    </strong>
                    {retards.length > 0 &&
                      `, dont ${retards.map((c) => c.numero).join(", ")} en retard`}
                    . Leurs cautions restent détenues ; leurs pénalités éventuelles seront inscrites
                    en semaine {semaineSuivante(semaine, d.fuseau).numero}.
                  </>
                ) : null
              }
            />
          )}
        </div>
      </GlassCard>

      {cloturee && etat.enBase && (
        <p
          role="status"
          className="m-0 flex flex-wrap items-center gap-2.5 rounded-[18px] border border-[var(--bp-or-30)] bg-[var(--bp-voile-4)] px-5 py-3.5 text-sm text-texte-doux"
        >
          <Icon nom="cadenas" taille={16} className="text-or-icone" />
          Registre verrouillé le {quand(etat.enBase.clotureeLe!, "EEEE dd/MM 'à' HH:mm")}
          {etat.enBase.clotureePar && ` par ${nomCompte(etat.enBase.clotureePar)}`}.
          {etat.enBase.declarationSha256 && (
            <span className="text-xs chiffres text-texte-attenue">
              Empreinte SHA-256 de la déclaration : {etat.enBase.declarationSha256}
            </span>
          )}
        </p>
      )}

      <section
        aria-label="Synthèse de la semaine"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-4"
      >
        <Carte
          libelle="Solde d’ouverture"
          valeur={formaterDollars(syn.soldeOuverture)}
          detail={majuscule(quand(semaine.debut, "EEEE dd/MM 'à' HH:mm"))}
        />
        <Carte
          libelle="Total des recettes"
          ton="or"
          valeur={formaterDollars(syn.recettes)}
          detail={`Locations ${formaterDollars(v.locations)} · pénalités ${formaterDollars(v.penalites)}`}
        />
        <Carte
          libelle="Total des dépenses"
          valeur={formaterDollars(syn.depenses)}
          detail={
            v.impots > 0
              ? `Dont impôt S${semaine.numero - 1} : ${formaterDollars(v.impots)}`
              : "Aucun impôt réglé"
          }
        />
        <Carte
          libelle="Résultat imposable"
          ton="resultat"
          valeur={formaterDollars(syn.resultatImposable)}
          detail="Recettes − dépenses"
        />
        <Carte
          libelle="Cautions détenues"
          ton="caution"
          valeur={formaterDollars(syn.cautionsDetenues)}
          detail="Hors recettes · à restituer"
        />
        <Carte
          libelle={cloturee ? "Solde de clôture" : "Solde provisoire"}
          valeur={formaterDollars(syn.solde)}
          detail={
            cloturee && etat.enBase?.clotureeLe
              ? `Clôturé ${quand(etat.enBase.clotureeLe, "EEEE dd/MM, HH:mm")}`
              : `Au ${quand(d.maintenant, "EEEE dd/MM, HH:mm")}`
          }
        />
      </section>

      {!cloturee && (
        <GlassCard
          as="section"
          variante="admin"
          aria-labelledby="titre-controles"
          className="flex flex-wrap items-center gap-x-10 gap-y-3.5 px-6 py-5"
        >
          <h2 id="titre-controles" className="m-0 flex-[1_1_100%] titre text-base font-semibold">
            Contrôles avant clôture
          </h2>
          {controlesAffiches.map((c) => (
            <LigneControle key={c.cle} c={c} retards={retards.length > 0} />
          ))}
          {bloquants
            .filter((c) => !controlesAffiches.includes(c))
            .map((c) => (
              <LigneControle key={c.cle} c={c} retards={false} />
            ))}
        </GlassCard>
      )}

      <GlassCard
        as="section"
        variante="admin"
        aria-labelledby="titre-registre"
        className="flex flex-col gap-3.5 rounded-[24px] px-2 pt-[18px] pb-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-3.5 px-3">
          <div className="flex flex-col gap-[3px]">
            <h2 id="titre-registre" className="m-0 titre text-lg font-semibold">
              Registre des opérations
            </h2>
            <span className="text-[13px] text-texte-attenue">
              Chaque opération est numérotée et rattachée à un contrat ou à un justificatif.
            </span>
          </div>
          <Seg
            libelle="Filtrer le registre"
            valeur={onglet}
            options={ONGLETS.map((o) => ({
              ...o,
              compteur: compteurs[o.valeur],
              href: lien(semaine.id, o.valeur),
            }))}
          />
        </div>
        <div className="overflow-x-auto">
          <DataGrid
            libelle={`Registre des opérations de la semaine ${semaine.numero}`}
            className="min-w-[1020px]"
            hauteurLigne={50}
            vide="Aucune opération sur cette période."
            colonnes={[
              { cle: "numero", titre: "N°", largeur: "52px" },
              { cle: "date", titre: "Date", largeur: "120px" },
              { cle: "categorie", titre: "Catégorie", largeur: "140px" },
              { cle: "libelle", titre: "Libellé", largeur: "minmax(170px,1fr)" },
              { cle: "piece", titre: "Pièce", largeur: "150px" },
              { cle: "recette", titre: "Recette", largeur: "92px", alignement: "droite" },
              { cle: "depense", titre: "Dépense", largeur: "92px", alignement: "droite" },
              { cle: "caution", titre: "Caution", largeur: "92px", alignement: "droite" },
              ...(avecApports
                ? [
                    {
                      cle: "apport" as const,
                      titre: "Apport",
                      largeur: "92px",
                      alignement: "droite" as const,
                    },
                  ]
                : []),
            ]}
            lignes={[
              ...lignes.map((m) => {
                const c = colonneRegistre(m);
                const barre = m.annuleMouvementId !== null || m.annulePar !== null;
                const mentions = [
                  m.annulePar && `Annulé par ${numeroOperationAffiche(m.annulePar.numero)}`,
                  m.annuleMouvement &&
                    `Contre-passation de ${numeroOperationAffiche(m.annuleMouvement.numero)}`,
                  mentionReport(m.date, semaine, d.fuseau),
                ].filter(Boolean);
                const cellules: Record<string, ReactNode> = {
                  numero: (
                    <span className="font-extrabold chiffres text-texte-attenue">
                      {numeroOperationAffiche(m.numero).slice(-3)}
                    </span>
                  ),
                  date: (
                    <span className="chiffres text-argent-1">
                      {majuscule(quand(m.date, "EEE dd/MM HH:mm"))}
                    </span>
                  ),
                  categorie: <span className="bp-tag">{LIBELLES_CATEGORIE[m.categorie]}</span>,
                  libelle: (
                    <span className="flex flex-col gap-0.5">
                      <span className={cx(barre && "line-through")}>{m.motif}</span>
                      {mentions.length > 0 && (
                        <span className="text-xs text-texte-attenue">{mentions.join(" · ")}</span>
                      )}
                    </span>
                  ),
                  piece: m.justificatifNumero ? (
                    <Link
                      href={`/admin/solde?periode=${m.semaineId}&q=${m.justificatifNumero}`}
                      className="bp-tag bp-cible border-[var(--bp-or-35)] text-or-texte"
                    >
                      <Icon nom="trombone" taille={13} />
                      {m.justificatifNumero}
                    </Link>
                  ) : m.contrat ? (
                    <Link
                      href={`/admin/contrats?onglet=${m.contrat.statut === "EN_COURS" ? "en-cours" : "termines"}&q=${m.contrat.numero}`}
                      className="bp-tag bp-cible hover:text-texte"
                    >
                      <Icon nom="document" taille={13} />
                      {m.contrat.numero}
                    </Link>
                  ) : (
                    <span className="text-texte-attenue">—</span>
                  ),
                  [c.colonne]: (
                    <span className={cx(barre && "line-through")}>
                      {montant(c.montant, c.colonne)}
                    </span>
                  ),
                };
                return { cle: m.id, cellules };
              }),
              {
                cle: "totaux",
                cellules: {
                  libelle: (
                    <span className="libelle text-[10.5px] tracking-[0.2em] text-argent-1">
                      Totaux · {lignes.length} opération{lignes.length > 1 ? "s" : ""}
                    </span>
                  ),
                  recette: montant(totaux.recette, "recette"),
                  depense: montant(totaux.depense, "depense"),
                  caution: montant(totaux.caution, "caution"),
                  ...(avecApports && { apport: montant(totaux.apport, "apport") }),
                },
              },
            ]}
          />
        </div>
      </GlassCard>
    </>
  );
}

export default function PageComptabilite({ searchParams }: PageProps<"/admin/comptabilite">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
