import "server-only";
import { montantSigne } from "@/domaine/comptabilite";
import { numeroJustificatif, numeroOperationEnBase } from "@/domaine/numerotation";
import { semaineImputation, type SemaineFiscale } from "@/domaine/semaine";
import { verifierFilialeMouvement } from "@/domaine/filiales";
import {
  ErreurMetier,
  type CategorieMouvement,
  type CodeFiliale,
  type Sens,
} from "@/domaine/types";
import type { Tx } from "@/lib/transaction";

// Inscription des mouvements (CONCEPTION § 6.3 et § 6.4). Toujours appelée dans une
// transaction : numérotation continue garantie par les compteurs de la semaine.

/** Solde de la caisse : solde d'ouverture de la première semaine + tous les mouvements. */
export async function soldeCourant(tx: Tx): Promise<number> {
  const premiere = await tx.semaine.findFirst({
    orderBy: { debut: "asc" },
    select: { soldeOuverture: true },
  });
  const totaux = await tx.mouvement.groupBy({ by: ["sens"], _sum: { montant: true } });
  const somme = totaux.reduce(
    (t, l) => t + montantSigne({ sens: l.sens, montant: l._sum.montant ?? 0 }),
    0,
  );
  return (premiere?.soldeOuverture ?? 0) + somme;
}

/** Semaine en base, créée au premier besoin avec le solde courant pour ouverture. */
export async function assurerSemaine(tx: Tx, s: SemaineFiscale) {
  const existante = await tx.semaine.findUnique({ where: { id: s.id } });
  if (existante) return existante;
  return tx.semaine.create({
    data: {
      id: s.id,
      annee: s.annee,
      numero: s.numero,
      debut: s.debut,
      fin: s.fin,
      soldeOuverture: await soldeCourant(tx),
    },
  });
}

export type NouveauMouvement = {
  date: Date;
  sens: Sens;
  categorie: CategorieMouvement;
  montant: number;
  motif: string;
  saisiParId: string;
  contratId?: string | null;
  automatique?: boolean;
  /** Clé de stockage du justificatif (dépense) : un numéro JUST-SS-NN lui est attribué. */
  justificatif?: string | null;
  annuleMouvementId?: string | null;
  /** Filiale concernée ; null ou absente = Groupe (frais communs). */
  filiale?: CodeFiliale | null;
};

export async function inscrireMouvement(tx: Tx, m: NouveauMouvement, fuseau: string) {
  if (!Number.isSafeInteger(m.montant) || m.montant <= 0)
    throw new ErreurMetier("Montant invalide.");
  verifierFilialeMouvement(m.categorie, m.filiale ?? null);
  const cloturees = new Set(
    (await tx.semaine.findMany({ where: { statut: "CLOTUREE" }, select: { id: true } })).map(
      (s) => s.id,
    ),
  );
  // Une date dans une semaine clôturée est reportée sur la première semaine ouverte ; le
  // registre l'indique en comparant la date aux bornes de la semaine.
  const { semaine: cible } = semaineImputation(m.date, fuseau, (id) => cloturees.has(id));
  await assurerSemaine(tx, cible);
  const semaine = await tx.semaine.update({
    where: { id: cible.id, statut: "OUVERTE" },
    data: {
      compteurOperations: { increment: 1 },
      ...(m.justificatif && { compteurJustificatifs: { increment: 1 } }),
    },
  });

  return tx.mouvement.create({
    data: {
      numero: numeroOperationEnBase(semaine.annee, semaine.numero, semaine.compteurOperations),
      semaineId: semaine.id,
      date: m.date,
      sens: m.sens,
      categorie: m.categorie,
      montant: m.montant,
      motif: m.motif.trim(),
      contratId: m.contratId ?? null,
      automatique: m.automatique ?? false,
      justificatif: m.justificatif ?? null,
      justificatifNumero: m.justificatif
        ? numeroJustificatif(semaine.numero, semaine.compteurJustificatifs)
        : null,
      annuleMouvementId: m.annuleMouvementId ?? null,
      filiale: m.filiale ?? null,
      saisiParId: m.saisiParId,
    },
  });
}

/** Règles et fuseau de Parametres utiles aux écritures. */
export async function lireRegles(tx: Tx) {
  const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
  return {
    fuseau: p.fuseauServeur,
    toleranceRetardMin: p.toleranceRetardMin,
    majorationRetard: p.majorationRetard,
    seuilDefautRestitutionMin: p.seuilDefautRestitutionMin,
    penalitesSurCaution: p.penalitesSurCaution,
    forfaitsDegats: p.forfaitsDegats as { libelle: string; montant: number }[],
  };
}
