import "server-only";
import {
  champsModifiables,
  montantSigne,
  preparerContrePassation,
  regleDe,
  synthese,
} from "@/domaine/comptabilite";
import { numeroJustificatif } from "@/domaine/numerotation";
import { semaineDe } from "@/domaine/semaine";
import { verifierContrePassation, verifierSaisieMouvement } from "@/domaine/solde";
import {
  ErreurMetier,
  type CategorieMouvement,
  type CodeFiliale,
  type Sens,
} from "@/domaine/types";
import type { ImageEnvoyee } from "@/lib/fichiers";
import type { CompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { enTransaction } from "@/lib/transaction";
import { journaliser } from "./audit";
import { lireDefinitionCategorie } from "./categories";
import { inscrireMouvement, lireRegles } from "./mouvements";
import { enregistrerFichier, supprimerFichier } from "./stockage";

// Page Solde (maquettes 12–13) et corrections des mouvements (CONCEPTION § 6.3–6.5).

const AVEC_LIENS = {
  contrat: { select: { id: true, numero: true, clientNom: true, statut: true } },
  venteCarte: { select: { numero: true, clientNom: true } },
  saisiPar: {
    select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true, avatarUrl: true },
  },
  semaine: {
    select: { id: true, annee: true, numero: true, statut: true, debut: true, fin: true },
  },
  annulePar: { select: { id: true, numero: true } },
  annuleMouvement: { select: { id: true, numero: true } },
} as const;

/** Solde courant : ouverture de la première semaine + tous les mouvements. */
async function soldeActuel() {
  const [premiere, totaux] = await Promise.all([
    prisma.semaine.findFirst({ orderBy: { debut: "asc" }, select: { soldeOuverture: true } }),
    prisma.mouvement.groupBy({ by: ["sens"], _sum: { montant: true } }),
  ]);
  return totaux.reduce(
    (t, l) => t + montantSigne({ sens: l.sens, montant: l._sum.montant ?? 0 }),
    premiere?.soldeOuverture ?? 0,
  );
}

/** Données du haut de page : solde, semaine en cours, cautions détenues, semaines connues. */
export async function lireSyntheseSolde(instant: Date, fuseau: string) {
  const courante = semaineDe(instant, fuseau);
  const [solde, enBase, mouvements, cautions, p, semaines] = await Promise.all([
    soldeActuel(),
    prisma.semaine.findUnique({ where: { id: courante.id } }),
    prisma.mouvement.findMany({
      where: { semaineId: courante.id },
      select: {
        numero: true,
        date: true,
        sens: true,
        categorie: true,
        montant: true,
        filiale: true,
        annuleMouvementId: true,
      },
      orderBy: { date: "asc" },
    }),
    prisma.contrat.aggregate({ where: { statut: "EN_COURS" }, _sum: { caution: true } }),
    prisma.parametres.findUniqueOrThrow({ where: { id: 1 }, select: { tauxImpot: true } }),
    prisma.semaine.findMany({
      orderBy: { debut: "desc" },
      select: { id: true, numero: true, debut: true, fin: true, statut: true },
    }),
  ]);
  // Semaine pas encore créée (aucun mouvement) : elle ouvrira sur le solde courant.
  const soldeOuverture = enBase?.soldeOuverture ?? solde;
  return {
    courante,
    solde,
    soldeOuverture,
    mouvements,
    synthese: synthese(mouvements, soldeOuverture, {
      regle: regleDe(enBase?.regleComptable),
      tauxImpot: enBase?.tauxImpot ?? p.tauxImpot,
    }),
    cautionsDetenues: cautions._sum.caution ?? 0,
    semaines,
  };
}

/** Historique d'une semaine (ou de tout le registre), du plus récent au plus ancien. */
export function lireHistorique(semaineId: string | null) {
  return prisma.mouvement.findMany({
    where: semaineId ? { semaineId } : {},
    include: AVEC_LIENS,
    orderBy: [{ date: "desc" }, { numero: "desc" }],
  });
}

export type MouvementAvecLiens = Awaited<ReturnType<typeof lireHistorique>>[number];

/** Contrats proposés comme « contrat lié » : en cours d'abord, puis les plus récents. */
export function lireContratsLiables() {
  return prisma.contrat.findMany({
    where: { statut: { not: "ANNULE" } },
    select: { id: true, numero: true, clientNom: true, statut: true },
    orderBy: [{ statut: "asc" }, { numero: "desc" }],
    take: 40,
  });
}

// ── Écritures ──────────────────────────────────────────────────────────────

export type SaisieMouvementManuel = {
  sens: Sens;
  categorie: CategorieMouvement;
  montant: number;
  motif: string;
  date: Date;
  contratId: string | null;
  filiale: CodeFiliale | null;
};

/** Le fichier n'est supprimé que si aucun autre mouvement ne le référence. */
async function libererJustificatif(cle: string) {
  const utilisations = await prisma.mouvement.count({ where: { justificatif: cle } });
  if (utilisations === 0) await supprimerFichier(cle);
}

export async function creerMouvement(
  acteur: CompteConnecte,
  d: SaisieMouvementManuel,
  image: ImageEnvoyee | null,
) {
  const categorie = await lireDefinitionCategorie(prisma, d.categorie);
  verifierSaisieMouvement(
    { ...d, categorie, avecJustificatif: image !== null },
    await maintenant(),
  );
  const cle = image
    ? await enregistrerFichier("justificatifs", image.octets, image.extension)
    : null;
  try {
    return await enTransaction(async (tx) => {
      if (d.contratId && !(await tx.contrat.findUnique({ where: { id: d.contratId } }))) {
        throw new ErreurMetier("Contrat lié introuvable.");
      }
      const { fuseau } = await lireRegles(tx);
      const m = await inscrireMouvement(
        tx,
        { ...d, justificatif: cle, automatique: false, saisiParId: acteur.id },
        fuseau,
      );
      await journaliser(tx, {
        compteId: acteur.id,
        action: "mouvement.creer",
        cible: m.numero,
        details: { sens: m.sens, categorie: m.categorie, montant: m.montant },
      });
      return { id: m.id, numero: m.numero };
    });
  } catch (e) {
    if (cle) await supprimerFichier(cle);
    throw e;
  }
}

/** Correction § 6.5 : seuls le motif et le justificatif d'un mouvement manuel changent. */
export async function modifierMouvement(
  acteur: CompteConnecte,
  id: string,
  d: { motif: string },
  image: ImageEnvoyee | null,
) {
  if (d.motif.trim().length < 3) throw new ErreurMetier("Motif : 3 caractères minimum.");
  const cle = image
    ? await enregistrerFichier("justificatifs", image.octets, image.extension)
    : null;
  try {
    const ancien = await enTransaction(async (tx) => {
      const m = await tx.mouvement.findUnique({
        where: { id },
        include: { semaine: true, annulePar: { select: { id: true } } },
      });
      if (!m) throw new ErreurMetier("Mouvement introuvable.");
      if (m.annuleMouvementId || m.annulePar) {
        throw new ErreurMetier("Mouvement annulé par contre-passation : il n’est plus modifiable.");
      }
      if (champsModifiables(m, m.semaine.statut).length === 0) {
        throw new ErreurMetier(
          m.automatique
            ? "Mouvement généré par un contrat ou une vente : non modifiable."
            : "Semaine clôturée : le registre est en lecture seule.",
        );
      }
      let justificatifNumero = m.justificatifNumero;
      if (cle && !justificatifNumero) {
        const s = await tx.semaine.update({
          where: { id: m.semaineId, statut: "OUVERTE" },
          data: { compteurJustificatifs: { increment: 1 } },
        });
        justificatifNumero = numeroJustificatif(s.numero, s.compteurJustificatifs);
      }
      await tx.mouvement.update({
        where: { id },
        data: { motif: d.motif.trim(), ...(cle && { justificatif: cle, justificatifNumero }) },
      });
      await journaliser(tx, {
        compteId: acteur.id,
        action: "mouvement.modifier",
        cible: m.numero,
        details: {
          ...(m.motif !== d.motif.trim() && { motif: { avant: m.motif, apres: d.motif.trim() } }),
          ...(cle && { justificatif: justificatifNumero }),
        },
      });
      return cle ? m.justificatif : null;
    });
    if (ancien) await libererJustificatif(ancien);
  } catch (e) {
    if (cle) await supprimerFichier(cle);
    throw e;
  }
}

/** Contre-passation (§ 6.5) : mouvement inverse daté de maintenant, réservée aux administrateurs. */
export async function contrePasserMouvement(acteur: CompteConnecte, id: string) {
  return enTransaction(async (tx) => {
    const m = await tx.mouvement.findUnique({
      where: { id },
      include: { semaine: true, annulePar: { select: { id: true } } },
    });
    if (!m) throw new ErreurMetier("Mouvement introuvable.");
    verifierContrePassation({
      numero: m.numero,
      automatique: m.automatique,
      semaineCloturee: m.semaine.statut === "CLOTUREE",
    });
    const inverse = preparerContrePassation(m, m.annulePar !== null);
    const { fuseau } = await lireRegles(tx);
    const cp = await inscrireMouvement(
      tx,
      {
        ...inverse,
        date: await maintenant(),
        contratId: m.contratId,
        filiale: m.filiale,
        saisiParId: acteur.id,
      },
      fuseau,
    );
    await journaliser(tx, {
      compteId: acteur.id,
      action: "mouvement.contrePasser",
      cible: m.numero,
      details: { contrePassation: cp.numero, montant: m.montant },
    });
    return { numero: cp.numero };
  });
}

/** Registre des semaines demandées (mouvements réduits au calcul des recettes). */
export function lireMouvementsDesSemaines(ids: readonly string[]) {
  return prisma.semaine.findMany({
    where: { id: { in: [...ids] } },
    select: {
      id: true,
      regleComptable: true,
      mouvements: {
        select: {
          numero: true,
          sens: true,
          categorie: true,
          montant: true,
          annuleMouvementId: true,
        },
      },
    },
  });
}
