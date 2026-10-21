import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { formaterDollars } from "./argent";
import { lireNumeroOperation, libelleSemaine, numeroOperationAffiche } from "./numerotation";
import { estEnRetard } from "./retard";
import { ouvertureCloture, semainePrecedente, type SemaineFiscale } from "./semaine";
import { ErreurMetier, type CategorieMouvement, type Sens, type StatutSemaine } from "./types";

// HANDOFF § 7.6 et CONCEPTION § 6.5–6.6.

export type MouvementComptable = {
  id?: string;
  numero: string;
  sens: Sens;
  categorie: CategorieMouvement;
  montant: number;
  justificatifNumero?: string | null;
  /** Renseigné sur une contre-passation : id du mouvement annulé. */
  annuleMouvementId?: string | null;
  automatique?: boolean;
};

export type Nature = "RECETTE" | "DEPENSE" | "CAUTION" | "APPORT";

const NATURES: Record<CategorieMouvement, Nature> = {
  LOCATION: "RECETTE",
  PENALITE: "RECETTE",
  ENTRETIEN: "DEPENSE",
  IMPOTS: "DEPENSE",
  ACHAT_VEHICULE: "DEPENSE",
  DIVERS: "DEPENSE",
  CAUTION_ENCAISSEE: "CAUTION",
  CAUTION_RENDUE: "CAUTION",
  APPORT: "APPORT",
};

export const natureMouvement = (c: CategorieMouvement): Nature => NATURES[c];

/** Montant signé du point de vue de la caisse : + entrée, − sortie. */
export const montantSigne = (m: Pick<MouvementComptable, "sens" | "montant">) =>
  m.sens === "ENTREE" ? m.montant : -m.montant;

export type Synthese = {
  soldeOuverture: number;
  entrees: number;
  sorties: number;
  recettes: number;
  depenses: number;
  resultatImposable: number;
  cautionsEncaissees: number;
  cautionsRendues: number;
  /** Cautions détenues en fin de période (hors résultat). */
  cautionsDetenues: number;
  apports: number;
  solde: number;
  nombreOperations: number;
};

/**
 * Synthèse d'une période. Chaque mouvement compte avec son signe, si bien qu'une
 * contre-passation (même catégorie, sens inverse) annule exactement le mouvement d'origine.
 * `cautionsDetenuesOuverture` : cautions déjà détenues au début de la période.
 */
export function synthese(
  mouvements: readonly MouvementComptable[],
  soldeOuverture: number,
  options: { cautionsDetenuesOuverture?: number } = {},
): Synthese {
  let entrees = 0;
  let sorties = 0;
  let recettes = 0;
  let depenses = 0;
  let cautionsEncaissees = 0;
  let cautionsRendues = 0;
  let apports = 0;

  for (const m of mouvements) {
    if (!Number.isSafeInteger(m.montant) || m.montant < 0) {
      throw new ErreurMetier(`Montant invalide sur ${m.numero}.`);
    }
    const signe = montantSigne(m);
    if (m.sens === "ENTREE") entrees += m.montant;
    else sorties += m.montant;

    switch (m.categorie) {
      case "LOCATION":
      case "PENALITE":
        recettes += signe;
        break;
      case "ENTRETIEN":
      case "IMPOTS":
      case "ACHAT_VEHICULE":
      case "DIVERS":
        depenses -= signe;
        break;
      case "CAUTION_ENCAISSEE":
        cautionsEncaissees += signe;
        break;
      case "CAUTION_RENDUE":
        cautionsRendues -= signe;
        break;
      case "APPORT":
        apports += signe;
        break;
    }
  }

  return {
    soldeOuverture,
    entrees,
    sorties,
    recettes,
    depenses,
    resultatImposable: recettes - depenses,
    cautionsEncaissees,
    cautionsRendues,
    cautionsDetenues:
      (options.cautionsDetenuesOuverture ?? 0) + cautionsEncaissees - cautionsRendues,
    apports,
    solde: soldeOuverture + entrees - sorties,
    nombreOperations: mouvements.length,
  };
}

// ── Contrôles avant clôture ────────────────────────────────────────────────

export type NiveauControle = "ok" | "info" | "bloquant";
export type Controle = {
  cle:
    | "statut"
    | "semainePrecedente"
    | "date"
    | "justificatifs"
    | "numerotation"
    | "solde"
    | "contrats";
  niveau: NiveauControle;
  message: string;
};

const pluriel = (n: number, mot: string) => `${n} ${mot}${n > 1 ? "s" : ""}`;

/** Dépenses à justifier : sorties de nature dépense, hors contre-passations. */
const estDepenseAJustifier = (m: MouvementComptable) =>
  natureMouvement(m.categorie) === "DEPENSE" && m.sens === "SORTIE" && !m.annuleMouvementId;

function controleNumerotation(
  mouvements: readonly MouvementComptable[],
  numeroSemaine: number,
): Controle {
  const vus = new Set<number>();
  const anomalies: string[] = [];
  for (const m of mouvements) {
    const lu = lireNumeroOperation(m.numero);
    if (!lu || lu.semaine !== numeroSemaine) anomalies.push(`${m.numero} hors séquence`);
    else if (vus.has(lu.n)) anomalies.push(`${numeroOperationAffiche(m.numero)} en double`);
    else vus.add(lu.n);
  }
  for (let n = 1; n <= mouvements.length; n++) {
    if (!vus.has(n)) {
      anomalies.push(
        `OP-${String(numeroSemaine).padStart(2, "0")}-${String(n).padStart(3, "0")} manquant`,
      );
    }
  }
  if (anomalies.length > 0) {
    return {
      cle: "numerotation",
      niveau: "bloquant",
      message: `Numérotation à vérifier : ${anomalies.join(", ")}`,
    };
  }
  return {
    cle: "numerotation",
    niveau: "ok",
    message:
      mouvements.length === 0
        ? "Aucune opération enregistrée"
        : `${pluriel(mouvements.length, "opération")} numérotée${mouvements.length > 1 ? "s" : ""}, sans trou`,
  };
}

export function controlesAvantCloture(p: {
  semaine: SemaineFiscale & { statut: StatutSemaine };
  mouvements: readonly MouvementComptable[];
  soldeOuverture: number;
  /** Solde constaté par ailleurs (somme de tout l'historique en base) pour le rapprochement. */
  soldeConstate: number;
  contratsEnCours: readonly { numero: string; finPrevue: Date }[];
  semainePrecedenteCloturee: boolean;
  maintenant: Date;
  fuseau: string;
  /** Décision D4 : la clôture ouvre ce nombre d'heures avant la fin de semaine (24 = dimanche 00:00). */
  heuresAvantFinCloture: number;
}): { controles: Controle[]; cloturable: boolean } {
  const controles: Controle[] = [];
  const { semaine, fuseau } = p;

  if (semaine.statut === "CLOTUREE") {
    controles.push({ cle: "statut", niveau: "bloquant", message: "Semaine déjà clôturée" });
  }
  if (!p.semainePrecedenteCloturee) {
    const prec = semainePrecedente(semaine, fuseau);
    controles.push({
      cle: "semainePrecedente",
      niveau: "bloquant",
      message: `La semaine ${prec.numero} doit d'abord être clôturée`,
    });
  }
  const ouverture = ouvertureCloture(semaine, p.heuresAvantFinCloture, fuseau);
  if (p.maintenant.getTime() < ouverture.getTime()) {
    const quand = format(new TZDate(ouverture.getTime(), fuseau), "EEEE dd/MM 'à' HH:mm", {
      locale: fr,
    });
    controles.push({
      cle: "date",
      niveau: "bloquant",
      message: `Clôture possible à partir du ${quand}`,
    });
  }

  const depenses = p.mouvements.filter(estDepenseAJustifier);
  const sansJustificatif = depenses.filter((m) => !m.justificatifNumero);
  const justifiees = depenses.length - sansJustificatif.length;
  controles.push(
    depenses.length === 0
      ? { cle: "justificatifs", niveau: "ok", message: "Aucune dépense à justifier" }
      : {
          cle: "justificatifs",
          niveau: sansJustificatif.length ? "bloquant" : "ok",
          message:
            `${justifiees} / ${pluriel(depenses.length, "dépense")} justifiée${depenses.length > 1 ? "s" : ""}` +
            (sansJustificatif.length
              ? ` : ${sansJustificatif.map((m) => numeroOperationAffiche(m.numero)).join(", ")} sans justificatif`
              : ""),
        },
  );

  controles.push(controleNumerotation(p.mouvements, semaine.numero));

  const { solde } = synthese(p.mouvements, p.soldeOuverture);
  controles.push(
    solde === p.soldeConstate
      ? { cle: "solde", niveau: "ok", message: `Solde rapproché : ${formaterDollars(solde)}` }
      : {
          cle: "solde",
          niveau: "bloquant",
          message: `Écart de solde : registre ${formaterDollars(solde)}, constaté ${formaterDollars(p.soldeConstate)}`,
        },
  );

  const enCours = p.contratsEnCours.length;
  const enRetard = p.contratsEnCours.filter((c) => estEnRetard(c.finPrevue, p.maintenant)).length;
  controles.push(
    enCours === 0
      ? { cle: "contrats", niveau: "ok", message: "Aucun contrat en cours" }
      : {
          cle: "contrats",
          niveau: "info",
          message:
            `${pluriel(enCours, "contrat")} encore en cours` +
            (enRetard ? `, dont ${enRetard} en retard` : ""),
        },
  );

  return { controles, cloturable: controles.every((c) => c.niveau !== "bloquant") };
}

// ── Confirmation de clôture ────────────────────────────────────────────────

export const texteConfirmationCloture = (numeroSemaine: number) =>
  `CLÔTURER ${libelleSemaine(numeroSemaine)}`;

export const confirmationClotureValide = (saisie: string, numeroSemaine: number) =>
  saisie.normalize("NFC").trim().replace(/\s+/g, " ") === texteConfirmationCloture(numeroSemaine);

// ── Corrections (CONCEPTION § 6.5) ─────────────────────────────────────────

/** Champs d'un mouvement modifiables à la main. Jamais le montant, le sens ni la catégorie. */
export function champsModifiables(
  m: Pick<MouvementComptable, "automatique">,
  statutSemaine: StatutSemaine,
): readonly ("motif" | "justificatif")[] {
  if (statutSemaine === "CLOTUREE" || m.automatique) return [];
  return ["motif", "justificatif"];
}

/** Mouvement inverse annulant `m` (même catégorie, même montant, sens opposé). */
export function preparerContrePassation(
  m: MouvementComptable & { id: string },
  dejaAnnule: boolean,
): Pick<MouvementComptable, "sens" | "categorie" | "montant" | "annuleMouvementId"> & {
  motif: string;
} {
  if (m.annuleMouvementId) throw new ErreurMetier("Une contre-passation ne peut pas être annulée.");
  if (dejaAnnule) throw new ErreurMetier(`${numeroOperationAffiche(m.numero)} est déjà annulé.`);
  return {
    sens: m.sens === "ENTREE" ? "SORTIE" : "ENTREE",
    categorie: m.categorie,
    montant: m.montant,
    annuleMouvementId: m.id,
    motif: `Annulation de ${numeroOperationAffiche(m.numero)}`,
  };
}

// ── Tableau de bord (maquette 11) ──────────────────────────────────────────

/** Variation d'une semaine à l'autre : « +8,0 % » (null si la référence est nulle). */
export function variationPourcent(actuel: number, precedent: number): string | null {
  if (precedent === 0) return null;
  const p = ((actuel - precedent) / Math.abs(precedent)) * 100;
  const signe = p < 0 ? String.fromCharCode(0x2212) : "+";
  return `${signe}${Math.abs(p).toFixed(1).replace(".", ",")}${String.fromCharCode(0xa0)}%`;
}

export type RecetteSemaine = {
  numero: number;
  libelle: string;
  recettes: number;
  courante: boolean;
};

/**
 * Recettes (locations et pénalités, hors cautions) des `nombre` dernières semaines jusqu'à
 * la semaine courante incluse ; une semaine sans registre compte pour zéro.
 */
export function recettesParSemaine(
  semaines: readonly { id: string; mouvements: readonly MouvementComptable[] }[],
  fenetre: readonly { id: string; numero: number }[],
): RecetteSemaine[] {
  const parId = new Map(semaines.map((s) => [s.id, s.mouvements]));
  return fenetre.map((s, i) => ({
    numero: s.numero,
    libelle: libelleSemaine(s.numero),
    recettes: synthese(parId.get(s.id) ?? [], 0).recettes,
    courante: i === fenetre.length - 1,
  }));
}

/** Impôts réglés pendant la semaine (contre-passations déduites). */
export const impotsReglees = (mouvements: readonly MouvementComptable[]) =>
  mouvements.filter((m) => m.categorie === "IMPOTS").reduce((t, m) => t - montantSigne(m), 0);
