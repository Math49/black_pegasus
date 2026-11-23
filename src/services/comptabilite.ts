import "server-only";
import {
  confirmationClotureValide,
  controlesAvantCloture,
  estCaution,
  montantSigne,
  regleDe,
  synthese,
} from "@/domaine/comptabilite";
import { semaineParId, semaineSuivante, type SemaineFiscale } from "@/domaine/semaine";
import { ErreurMetier } from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";

// Comptabilité hebdomadaire (maquettes 19–20, CONCEPTION § 6.6).

/** Lecture seule : client Prisma ou transaction. */
type Lecteur = Pick<Tx, "semaine" | "mouvement" | "contrat" | "parametres">;

const MOUVEMENTS = {
  orderBy: [{ date: "asc" as const }, { numero: "asc" as const }],
  include: {
    contrat: { select: { id: true, numero: true, clientNom: true, statut: true } },
    venteCarte: { select: { numero: true, clientNom: true } },
    annulePar: { select: { numero: true } },
    annuleMouvement: { select: { numero: true } },
    categorieMouvement: { select: { nom: true, justificatifObligatoire: true } },
  },
};

/**
 * État comptable d'une semaine : registre, synthèse et contrôles avant clôture. Une semaine
 * sans aucune opération n'existe pas encore en base : elle ouvrira sur le solde courant.
 */
export async function etatSemaine(db: Lecteur, s: SemaineFiscale, instant: Date) {
  const [p, enBase, premiere, avant, precedente, contratsEnCours] = await Promise.all([
    db.parametres.findUniqueOrThrow({ where: { id: 1 } }),
    db.semaine.findUnique({
      where: { id: s.id },
      include: { mouvements: MOUVEMENTS, clotureePar: true },
    }),
    db.semaine.findFirst({ orderBy: { debut: "asc" }, select: { soldeOuverture: true } }),
    // Historique antérieur : solde constaté et cautions détenues à l'ouverture.
    db.mouvement.findMany({
      where: { semaine: { debut: { lt: s.debut } } },
      select: { sens: true, categorie: true, montant: true },
    }),
    db.semaine.findFirst({ where: { fin: { lte: s.debut } }, orderBy: { debut: "desc" } }),
    db.contrat.findMany({
      where: { statut: "EN_COURS" },
      select: { numero: true, finPrevue: true },
      orderBy: { finPrevue: "asc" },
    }),
  ]);
  // La règle de calcul est celle de la semaine ; le taux est figé à la clôture.
  const regle = regleDe(enBase?.regleComptable);
  const tauxImpot = enBase?.tauxImpot ?? p.tauxImpot;
  const mouvements = (enBase?.mouvements ?? []).map((m) => ({
    ...m,
    justificatifRequis: m.categorieMouvement.justificatifObligatoire,
  }));
  const soldeAvant = avant.reduce((t, m) => t + montantSigne(m), premiere?.soldeOuverture ?? 0);
  const soldeOuverture = enBase?.soldeOuverture ?? soldeAvant;
  const cautionsDetenuesOuverture = avant
    .filter((m) => estCaution(m.categorie))
    .reduce((t, m) => t + montantSigne(m), 0);
  const statut = enBase?.statut ?? "OUVERTE";
  const soldeConstate = soldeAvant + mouvements.reduce((t, m) => t + montantSigne(m), 0);

  const { controles, cloturable } = controlesAvantCloture({
    semaine: { ...s, statut },
    mouvements,
    soldeOuverture,
    soldeConstate,
    contratsEnCours,
    semainePrecedenteCloturee: !precedente || precedente.statut === "CLOTUREE",
    maintenant: instant,
    fuseau: p.fuseauServeur,
    heuresAvantFinCloture: p.ouvertureClotureHeuresAvantFin,
    regle,
  });

  return {
    semaine: s,
    enBase,
    statut,
    mouvements,
    regle,
    synthese: synthese(mouvements, soldeOuverture, {
      cautionsDetenuesOuverture,
      regle,
      tauxImpot,
    }),
    controles,
    cloturable,
    contratsEnCours,
    parametres: p,
  };
}

export type EtatSemaine = Awaited<ReturnType<typeof etatSemaine>>;

export const lireEtatSemaine = (id: string, instant: Date, fuseau: string) =>
  etatSemaine(prisma, semaineParId(id, fuseau), instant);

/** Semaines connues (sélecteur) : la plus ancienne en base et la semaine courante bornent. */
export function lireBornesSemaines() {
  return prisma.semaine.findFirst({ orderBy: { debut: "asc" }, select: { id: true } });
}

/**
 * Clôture (§ 6.6) : contrôles refaits dans la transaction, confirmation « CLÔTURER S43 »,
 * semaine verrouillée et semaine suivante ouverte sur le solde de clôture.
 */
export async function cloturerSemaine(acteur: CompteConnecte, id: string, confirmation: string) {
  const instant = await maintenant();
  return enTransaction(async (tx) => {
    const { fuseauServeur } = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    const s = semaineParId(id, fuseauServeur);
    if (!confirmationClotureValide(confirmation, s.numero)) {
      throw new ErreurMetier(`Saisissez exactement « CLÔTURER S${s.numero} » pour confirmer.`);
    }
    const etat = await etatSemaine(tx, s, instant);
    if (!etat.enBase) throw new ErreurMetier("Aucune opération enregistrée cette semaine.");
    if (!etat.cloturable) {
      const bloquant = etat.controles.find((c) => c.niveau === "bloquant");
      throw new ErreurMetier(`Clôture impossible : ${bloquant?.message ?? "contrôle bloquant"}.`);
    }
    const soldeCloture = etat.synthese.solde;
    const verrou = await tx.semaine.updateMany({
      where: { id, statut: "OUVERTE" },
      data: {
        statut: "CLOTUREE",
        soldeCloture,
        clotureeLe: instant,
        clotureeParId: acteur.id,
        // Taux figé : un changement ultérieur des paramètres ne modifie pas la semaine.
        tauxImpot: etat.synthese.tauxImpot,
      },
    });
    if (verrou.count !== 1) throw new ErreurMetier("Semaine déjà clôturée.");

    // Semaine suivante : créée, ou recalée si des opérations y ont déjà été saisies.
    const suivante = semaineSuivante(s, fuseauServeur);
    await tx.semaine.upsert({
      where: { id: suivante.id },
      create: {
        id: suivante.id,
        annee: suivante.annee,
        numero: suivante.numero,
        debut: suivante.debut,
        fin: suivante.fin,
        soldeOuverture: soldeCloture,
      },
      update: { soldeOuverture: soldeCloture },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "semaine.cloturer",
      cible: `S${s.numero}`,
      details: {
        soldeCloture,
        recettes: etat.synthese.recettes,
        depenses: etat.synthese.depenses,
        baseImposable: etat.synthese.baseImposable,
        impotDu: etat.synthese.impotDu,
        operations: etat.synthese.nombreOperations,
      },
    });
    return { numero: s.numero, soldeCloture };
  });
}
