import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { CourbeSolde } from "@/composants/admin/solde/CourbeSolde";
import { HistoriqueMouvements } from "@/composants/admin/solde/HistoriqueMouvements";
import type { MouvementAffiche } from "@/composants/admin/solde/ModaleMouvement";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon } from "@/composants/ui/Icon";
import { Statut } from "@/composants/ui/Statut";
import { formaterDollars } from "@/domaine/argent";
import { champsModifiables, montantSigne } from "@/domaine/comptabilite";
import { nomCompte } from "@/domaine/comptes";
import {
  FILTRES_FILIALE,
  filtrerParFiliale,
  libelleFiliale,
  libelleFiltreFiliale,
  lireFiltreFiliale,
  SLUGS_FILIALE,
} from "@/domaine/filiales";
import { formaterHeureServeurIso, versHeureServeur } from "@/domaine/dates";
import { numeroOperationAffiche } from "@/domaine/numerotation";
import { peut } from "@/domaine/permissions";
import {
  CATEGORIES,
  courbeSemaine,
  evolutionSolde,
  exigeJustificatif,
  filtrerHistorique,
  LIBELLES_CATEGORIE,
  mentionReport,
  paginer,
} from "@/domaine/solde";
import type { CategorieMouvement } from "@/domaine/types";
import { exigerPermission } from "@/lib/garde";
import { lireDonneesPanel } from "@/services/panel";
import {
  lireContratsLiables,
  lireHistorique,
  lireSyntheseSolde,
  type MouvementAvecLiens,
} from "@/services/solde";

export const metadata: Metadata = { title: "Solde" };

const TAILLE_PAGE = 15;

function CarteFlux({
  titre,
  icone,
  montant,
  detail,
  entree,
}: {
  titre: string;
  icone: "entree" | "sortie";
  montant: string;
  detail: string;
  entree: boolean;
}) {
  return (
    <GlassCard variante="admin" className="flex flex-1 flex-col justify-between gap-2.5 p-[22px]">
      <div className="flex items-center justify-between">
        <span className="libelle text-[10.5px] tracking-[0.2em]">{titre}</span>
        <Icon nom={icone} className={entree ? "text-or-icone" : "text-argent-1"} />
      </div>
      <span
        className={`text-[30px] font-extrabold chiffres ${entree ? "text-or-texte" : "text-argent-1"}`}
      >
        {montant}
      </span>
      <span className="text-[12.5px] text-texte-attenue">{detail}</span>
    </GlassCard>
  );
}

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/solde">["searchParams"];
}) {
  const compte = await exigerPermission("solde.consulter");
  const peutModifier = peut(compte.role, "mouvement.modifier");
  const params = await searchParams;
  const d = await lireDonneesPanel();
  const [s, contrats] = await Promise.all([
    lireSyntheseSolde(d.maintenant, d.fuseau),
    lireContratsLiables(),
  ]);
  const { courante, synthese: syn } = s;

  // Filtres de l'historique (URL) : période = id de semaine ou « tout ».
  const periodes = [
    ...s.semaines.map((w) => ({
      valeur: w.id,
      libelle: `Semaine ${w.numero} · ${format(versHeureServeur(w.debut, d.fuseau), "d")}–${format(
        versHeureServeur(new Date(w.fin.getTime() - 1), d.fuseau),
        "d MMM",
        { locale: fr },
      )}`,
    })),
    { valeur: "tout", libelle: "Tout l’historique" },
  ];
  const periode = periodes.some((p) => p.valeur === params.periode)
    ? String(params.periode)
    : courante.id;
  const categorie = CATEGORIES.includes(params.categorie as CategorieMouvement)
    ? (params.categorie as CategorieMouvement)
    : null;
  const q = String(params.q ?? "");
  const filtreFiliale = lireFiltreFiliale(params.filiale);

  const historique = await lireHistorique(periode === "tout" ? null : periode);
  const page = paginer(
    filtrerHistorique(
      filtrerParFiliale(historique, filtreFiliale).map((m) => ({
        ...m,
        contratNumero: m.contrat?.numero ?? m.venteCarte?.numero,
        clientNom: m.contrat?.clientNom ?? m.venteCarte?.clientNom,
        saisiPar: nomCompte(m.saisiPar),
        compte: m.saisiPar,
      })),
      { q, categorie },
    ),
    Number(params.page ?? 1),
    TAILLE_PAGE,
  );

  const peutContrePasser = peut(compte.role, "mouvement.contrePasser");
  const afficher = (
    m: Omit<MouvementAvecLiens, "saisiPar"> & { compte: MouvementAvecLiens["saisiPar"] },
  ): MouvementAffiche => {
    const barre = m.annuleMouvementId !== null || m.annulePar !== null;
    const ouverte = m.semaine.statut === "OUVERTE";
    const modifiable = peutModifier && !barre && champsModifiables(m, m.semaine.statut).length > 0;
    const report = mentionReport(m.date, m.semaine, d.fuseau);
    return {
      id: m.id,
      numero: numeroOperationAffiche(m.numero),
      date: format(versHeureServeur(m.date, d.fuseau), "EEE dd/MM '·' HH:mm", { locale: fr }),
      sens: m.sens,
      categorie: LIBELLES_CATEGORIE[m.categorie],
      filiale: libelleFiliale(m.filiale),
      filialeSlug: m.filiale ? SLUGS_FILIALE[m.filiale] : undefined,
      montant: formaterDollars(montantSigne(m), { signe: true }),
      motif: m.motif,
      contrat: m.contrat
        ? {
            numero: m.contrat.numero,
            href: `/admin/contrats?onglet=${m.contrat.statut === "EN_COURS" ? "en-cours" : "termines"}&q=${m.contrat.numero}`,
          }
        : m.venteCarte
          ? { numero: m.venteCarte.numero, href: `/admin/cards/ventes?q=${m.venteCarte.numero}` }
          : null,
      saisiPar: { nom: nomCompte(m.compte), avatarUrl: m.compte.avatarUrl },
      justificatif:
        m.justificatif || m.justificatifNumero
          ? {
              numero: m.justificatifNumero,
              url: m.justificatif ? `/api/fichiers/${m.justificatif}` : null,
            }
          : null,
      exigeJustificatif: exigeJustificatif(m.sens, m.categorie),
      mentions: [
        m.annuleMouvement &&
          `Contre-passation de ${numeroOperationAffiche(m.annuleMouvement.numero)}`,
        m.annulePar && `Annulé par ${numeroOperationAffiche(m.annulePar.numero)}`,
        report,
      ].filter((x): x is string => Boolean(x)),
      barre,
      modifiable,
      verrou: modifiable
        ? null
        : !peutModifier
          ? "Consultation seule : votre rôle ne permet pas de modifier le registre."
          : barre
            ? "Mouvement contre-passé : plus aucune correction possible."
            : !ouverte
              ? "Semaine clôturée : le registre est en lecture seule."
              : "Mouvement généré par un contrat ou une vente : il se corrige en annulant celui-ci.",
      contrePassable: peutContrePasser && ouverte && !barre && !m.automatique,
    };
  };

  const evolution = evolutionSolde(s.soldeOuverture, s.solde);
  const quand = format(versHeureServeur(d.maintenant, d.fuseau), "EEE dd/MM, HH:mm", {
    locale: fr,
  });

  return (
    <>
      <EnTetePanel
        titre="Solde de l’entreprise"
        fil={[{ libelle: "Gestion" }, { libelle: "Solde" }]}
      />

      <section aria-label="Solde actuel" className="flex flex-wrap items-stretch gap-5">
        <GlassCard
          variante="admin"
          className="flex min-w-0 flex-[999_1_560px] flex-wrap items-center justify-between gap-6 rounded-[24px] px-[30px] py-7"
        >
          <div className="flex flex-col gap-3.5">
            <span className="libelle text-[10.5px] tracking-[0.2em]">Solde actuel · {quand}</span>
            <span className="texte-or text-[76px] leading-none font-extrabold tracking-[-0.02em] chiffres max-sm:text-[52px]">
              {formaterDollars(s.solde)}
            </span>
            <span className="flex flex-wrap items-center gap-2.5 text-sm text-texte-doux">
              <Statut ton="ok" icone={evolution.hausse ? "hausse" : "baisse"}>
                {evolution.libelle}
              </Statut>
              sur la semaine {courante.numero}
            </span>
            <span className="text-[13px] text-texte-attenue">
              Dont {formaterDollars(s.cautionsDetenues)} de cautions à restituer
            </span>
          </div>
          <CourbeSolde
            points={courbeSemaine(s.mouvements, s.soldeOuverture, courante, d.maintenant, d.fuseau)}
          />
        </GlassCard>
        <div className="flex flex-[1_1_260px] flex-col gap-5">
          <CarteFlux
            titre={`Entrées · S${courante.numero}`}
            icone="entree"
            entree
            montant={formaterDollars(syn.entrees, { signe: true })}
            detail={`Recettes ${formaterDollars(syn.recettes)} · cautions ${formaterDollars(syn.cautionsEncaissees)}`}
          />
          <CarteFlux
            titre={`Sorties · S${courante.numero}`}
            icone="sortie"
            entree={false}
            montant={formaterDollars(-syn.sorties)}
            detail={`Dépenses ${formaterDollars(syn.depenses)} · cautions rendues ${formaterDollars(syn.cautionsRendues)}`}
          />
        </div>
      </section>

      <HistoriqueMouvements
        lignes={page.elements.map(afficher)}
        pagination={page}
        filtres={{ q, categorie: categorie ?? "", periode, filiale: filtreFiliale ?? "" }}
        filiales={[
          { valeur: "", libelle: "Toutes les filiales" },
          ...FILTRES_FILIALE.map((f) => ({ valeur: f, libelle: libelleFiltreFiliale(f) })),
        ]}
        categories={[
          { valeur: "", libelle: "Toutes les catégories" },
          ...CATEGORIES.map((c) => ({ valeur: c, libelle: LIBELLES_CATEGORIE[c] })),
        ]}
        periodes={periodes}
        nouveau={
          peut(compte.role, "mouvement.creer")
            ? {
                semaine: courante.numero,
                dateParDefaut: formaterHeureServeurIso(d.maintenant, d.fuseau),
                contrats: contrats.map((c) => ({
                  id: c.id,
                  numero: c.numero,
                  clientNom: c.clientNom,
                })),
                acteur: { nom: nomCompte(compte), avatarUrl: compte.avatarUrl },
              }
            : null
        }
      />
    </>
  );
}

export default function PageSolde({ searchParams }: PageProps<"/admin/solde">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
