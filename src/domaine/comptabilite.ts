import { fr } from "date-fns/locale";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";
import { formaterDollars } from "./argent";
import { lireNumeroOperation, libelleSemaine, numeroOperationAffiche } from "./numerotation";
import { estEnRetard } from "./retard";
import { ouvertureCloture, semainePrecedente, type SemaineFiscale } from "./semaine";
import { CODES_FILIALE } from "./filiales";
import {
  ErreurMetier,
  type CategorieMouvement,
  type CodeFiliale,
  type Sens,
  type StatutSemaine,
} from "./types";

// HANDOFF § 7.6 et CONCEPTION § 6.5–6.6, modifiés par REFONTE-ADMIN § 2.

export type MouvementComptable = {
  id?: string;
  numero: string;
  sens: Sens;
  categorie: CategorieMouvement;
  montant: number;
  justificatifNumero?: string | null;
  /** Renseigné sur une contre-passation : id du mouvement annulé. */
  annuleMouvementId?: string | null;
  /** Règle 2 : la catégorie exige un justificatif pour une sortie. */
  justificatifRequis?: boolean;
  automatique?: boolean;
};

export type Nature = "RECETTE" | "DEPENSE" | "CAUTION" | "APPORT";

/**
 * Règle de calcul d'une semaine. 1 : HANDOFF § 7.6 (nature fixée par la catégorie, résultat
 * imposable = recettes − dépenses), conservée pour les semaines clôturées avant la refonte.
 * 2 : REFONTE-ADMIN § 2 (nature donnée par le sens, impôt = taux × recettes).
 */
export type RegleComptable = 1 | 2;
export const REGLE_ACTUELLE: RegleComptable = 2;

/** Règle lue en base (`Semaine.regleComptable`) ; une semaine pas encore créée suit l'actuelle. */
export const regleDe = (valeur: number | null | undefined): RegleComptable =>
  valeur === 1 ? 1 : REGLE_ACTUELLE;

/** Catégories système des cautions : hors recettes et hors dépenses dans les deux règles. */
export const estCaution = (categorie: CategorieMouvement) =>
  categorie === "CAUTION_ENCAISSEE" || categorie === "CAUTION_RENDUE";

const NATURES_REGLE_1: Partial<Record<CategorieMouvement, Nature>> = {
  LOCATION: "RECETTE",
  PENALITE: "RECETTE",
  FORMATION: "RECETTE",
  VENTE_CARTES: "RECETTE",
  ACHAT_STOCK: "DEPENSE",
  ENTRETIEN: "DEPENSE",
  IMPOTS: "DEPENSE",
  ACHAT_VEHICULE: "DEPENSE",
  DIVERS: "DEPENSE",
  APPORT: "APPORT",
};

type LigneNature = Pick<MouvementComptable, "categorie" | "sens" | "annuleMouvementId">;

/**
 * Nature d'un mouvement. Règle 2 : toute entrée est une recette, toute sortie une dépense,
 * sauf les cautions. Une contre-passation garde la nature du mouvement qu'elle annule.
 */
export function natureMouvement(m: LigneNature, regle: RegleComptable = REGLE_ACTUELLE): Nature {
  if (estCaution(m.categorie)) return "CAUTION";
  const fixee = regle === 1 ? NATURES_REGLE_1[m.categorie] : undefined;
  if (fixee) return fixee;
  const sensOrigine = m.annuleMouvementId ? (m.sens === "ENTREE" ? "SORTIE" : "ENTREE") : m.sens;
  return sensOrigine === "ENTREE" ? "RECETTE" : "DEPENSE";
}

/** Impôt dû : taux (en %) appliqué à la base, arrondi au dollar ; jamais négatif. */
export function calculerImpot(base: number, tauxPourcent: number): number {
  if (!Number.isInteger(tauxPourcent) || tauxPourcent < 0 || tauxPourcent > 100) {
    throw new ErreurMetier("Taux d’impôt : nombre entier entre 0 et 100.");
  }
  return Math.round((Math.max(0, base) * tauxPourcent) / 100);
}

/** Montant signé du point de vue de la caisse : + entrée, − sortie. */
export const montantSigne = (m: Pick<MouvementComptable, "sens" | "montant">) =>
  m.sens === "ENTREE" ? m.montant : -m.montant;

export type Synthese = {
  regle: RegleComptable;
  soldeOuverture: number;
  entrees: number;
  sorties: number;
  recettes: number;
  depenses: number;
  /** Règle 2 : les recettes ; règle 1 : le résultat imposable (recettes − dépenses). */
  baseImposable: number;
  /** Taux appliqué (en %) ; null en règle 1 ou sans taux fourni. */
  tauxImpot: number | null;
  /** Impôt dû sur la base ; null en règle 1 ou sans taux fourni. */
  impotDu: number | null;
  cautionsEncaissees: number;
  cautionsRendues: number;
  /** Cautions détenues en fin de période (hors résultat). */
  cautionsDetenues: number;
  /** Règle 1 seulement : en règle 2, un apport est une recette. */
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
  options: {
    cautionsDetenuesOuverture?: number;
    regle?: RegleComptable;
    /** Taux d'impôt en % (règle 2). */
    tauxImpot?: number | null;
  } = {},
): Synthese {
  const regle = options.regle ?? REGLE_ACTUELLE;
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

    switch (natureMouvement(m, regle)) {
      case "RECETTE":
        recettes += signe;
        break;
      case "DEPENSE":
        depenses -= signe;
        break;
      case "CAUTION":
        if (m.categorie === "CAUTION_ENCAISSEE") cautionsEncaissees += signe;
        else cautionsRendues -= signe;
        break;
      case "APPORT":
        apports += signe;
        break;
    }
  }

  const baseImposable = regle === 1 ? recettes - depenses : recettes;
  const taux = regle === 2 ? (options.tauxImpot ?? null) : null;
  return {
    regle,
    soldeOuverture,
    entrees,
    sorties,
    recettes,
    depenses,
    baseImposable,
    tauxImpot: taux,
    impotDu: taux === null ? null : calculerImpot(baseImposable, taux),
    cautionsEncaissees,
    cautionsRendues,
    cautionsDetenues:
      (options.cautionsDetenuesOuverture ?? 0) + cautionsEncaissees - cautionsRendues,
    apports,
    solde: soldeOuverture + entrees - sorties,
    nombreOperations: mouvements.length,
  };
}

// ── Ventilation par filiale (CONCEPTION-FILIALES § 7) ──────────────────────

export type LigneFiliale = {
  /** null : Groupe (frais communs, impôts). */
  filiale: CodeFiliale | null;
  recettes: number;
  depenses: number;
  resultat: number;
  nombreOperations: number;
};

/**
 * Recettes, dépenses et résultat de chaque filiale, puis du Groupe (mouvements sans
 * filiale). La somme des lignes est exactement la synthèse du groupe ; l'impôt reste
 * calculé sur le groupe.
 */
export function syntheseParFiliale(
  mouvements: readonly (MouvementComptable & { filiale: CodeFiliale | null })[],
  regle: RegleComptable = REGLE_ACTUELLE,
): LigneFiliale[] {
  return [...CODES_FILIALE, null].map((filiale) => {
    const s = synthese(
      mouvements.filter((m) => m.filiale === filiale),
      0,
      { regle },
    );
    return {
      filiale,
      recettes: s.recettes,
      depenses: s.depenses,
      resultat: s.recettes - s.depenses,
      nombreOperations: s.nombreOperations,
    };
  });
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

/**
 * Dépenses à justifier, hors contre-passations. Règle 2 : sorties dont la catégorie exige
 * un justificatif ; règle 1 : toute sortie de nature dépense.
 */
const estDepenseAJustifier = (m: MouvementComptable, regle: RegleComptable) =>
  m.sens === "SORTIE" &&
  !m.annuleMouvementId &&
  (regle === 1 ? natureMouvement(m, 1) === "DEPENSE" : m.justificatifRequis === true);

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
  regle?: RegleComptable;
}): { controles: Controle[]; cloturable: boolean } {
  const controles: Controle[] = [];
  const { semaine, fuseau } = p;
  const regle = p.regle ?? REGLE_ACTUELLE;

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

  const depenses = p.mouvements.filter((m) => estDepenseAJustifier(m, regle));
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

  const { solde } = synthese(p.mouvements, p.soldeOuverture, { regle });
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
 * Recettes (toutes filiales, hors cautions) des semaines de la fenêtre, chacune selon sa
 * règle de calcul ; une semaine sans registre compte pour zéro.
 */
export function recettesParSemaine(
  semaines: readonly {
    id: string;
    mouvements: readonly MouvementComptable[];
    regleComptable?: number;
  }[],
  fenetre: readonly { id: string; numero: number }[],
): RecetteSemaine[] {
  const parId = new Map(semaines.map((s) => [s.id, s]));
  return fenetre.map((s, i) => {
    const registre = parId.get(s.id);
    return {
      numero: s.numero,
      libelle: libelleSemaine(s.numero),
      recettes: synthese(registre?.mouvements ?? [], 0, {
        regle: regleDe(registre?.regleComptable),
      }).recettes,
      courante: i === fenetre.length - 1,
    };
  });
}

/** Impôts réglés pendant la semaine (contre-passations déduites). */
export const impotsReglees = (mouvements: readonly MouvementComptable[]) =>
  mouvements.filter((m) => m.categorie === "IMPOTS").reduce((t, m) => t - montantSigne(m), 0);

// ── Registre hebdomadaire (maquettes 19 et 32) ─────────────────────────────

export type OngletRegistre = "toutes" | "recettes" | "depenses" | "cautions";

const NATURE_ONGLET: Record<Exclude<OngletRegistre, "toutes">, Nature> = {
  recettes: "RECETTE",
  depenses: "DEPENSE",
  cautions: "CAUTION",
};

export function filtrerRegistre<M extends LigneNature>(
  mouvements: readonly M[],
  onglet: OngletRegistre,
  regle: RegleComptable = REGLE_ACTUELLE,
): M[] {
  if (onglet === "toutes") return [...mouvements];
  return mouvements.filter((m) => natureMouvement(m, regle) === NATURE_ONGLET[onglet]);
}

export function compteursOnglets(
  mouvements: readonly LigneNature[],
  regle: RegleComptable = REGLE_ACTUELLE,
) {
  return {
    toutes: mouvements.length,
    recettes: filtrerRegistre(mouvements, "recettes", regle).length,
    depenses: filtrerRegistre(mouvements, "depenses", regle).length,
    cautions: filtrerRegistre(mouvements, "cautions", regle).length,
  };
}

/**
 * Colonne et montant d'une ligne du registre : recette (+), dépense (montant payé) ou caution
 * (signée). Une contre-passation apparaît en négatif dans la colonne de la ligne annulée.
 */
export function colonneRegistre(
  m: LigneNature & Pick<MouvementComptable, "montant">,
  regle: RegleComptable = REGLE_ACTUELLE,
): {
  colonne: "recette" | "depense" | "caution" | "apport";
  montant: number;
} {
  const s = montantSigne(m);
  switch (natureMouvement(m, regle)) {
    case "RECETTE":
      return { colonne: "recette", montant: s };
    case "DEPENSE":
      return { colonne: "depense", montant: -s };
    case "CAUTION":
      return { colonne: "caution", montant: s };
    case "APPORT":
      return { colonne: "apport", montant: s };
  }
}

/** Totaux des colonnes du registre (lignes affichées). */
export function totauxRegistre(
  mouvements: readonly (LigneNature & Pick<MouvementComptable, "montant">)[],
  regle: RegleComptable = REGLE_ACTUELLE,
) {
  const t = { recette: 0, depense: 0, caution: 0, apport: 0 };
  for (const m of mouvements) {
    const c = colonneRegistre(m, regle);
    t[c.colonne] += c.montant;
  }
  return t;
}

export type LigneVentilation = {
  categorie: CategorieMouvement;
  nature: "RECETTE" | "DEPENSE" | "APPORT";
  /** Montant net de la catégorie dans sa nature (contre-passations déduites). */
  montant: number;
};

/**
 * Ventilation par catégorie (synthèse de la déclaration, détail des totaux) : recettes,
 * apports puis dépenses, chacun par montant décroissant. Les cautions sont exclues.
 */
export function ventilation(
  mouvements: readonly (LigneNature & Pick<MouvementComptable, "montant">)[],
  regle: RegleComptable = REGLE_ACTUELLE,
): LigneVentilation[] {
  const lignes = new Map<string, LigneVentilation>();
  for (const m of mouvements) {
    const nature = natureMouvement(m, regle);
    if (nature === "CAUTION") continue;
    const cle = `${nature}:${m.categorie}`;
    const l = lignes.get(cle) ?? { categorie: m.categorie, nature, montant: 0 };
    l.montant += nature === "DEPENSE" ? -montantSigne(m) : montantSigne(m);
    lignes.set(cle, l);
  }
  const ordre = { RECETTE: 0, APPORT: 1, DEPENSE: 2 };
  return [...lignes.values()].sort(
    (a, b) => ordre[a.nature] - ordre[b.nature] || b.montant - a.montant,
  );
}

/** Nombre de contrats ayant produit une recette de location dans la période. */
export const contratsLoues = (
  mouvements: readonly (Pick<MouvementComptable, "categorie"> & { contratId?: string | null })[],
) =>
  new Set(
    mouvements.filter((m) => m.categorie === "LOCATION" && m.contratId).map((m) => m.contratId),
  ).size;

/** Pièce abrégée du registre imprimé : « CTR-2026-0031 » → « CTR-0031 ». */
export const pieceAbregee = (piece: string) => piece.replace(/^(CTR|BP[LFC])-\d{4}-/, "$1-");

// ── Export CSV du registre ─────────────────────────────────────────────────

export type LigneCsv = {
  numero: string;
  /** « 2026-10-19 09:15 », heure du serveur */
  date: string;
  categorie: string;
  /** « Location », « Formation », « Cards » ou « Groupe ». */
  filiale?: string;
  libelle: string;
  piece: string;
  sens: Sens;
  categorieCode: CategorieMouvement;
  montant: number;
  annuleMouvementId?: string | null;
  mention?: string;
};

const champCsv = (v: string | number) => {
  const t = String(v);
  // Neutralise les formules pour les tableurs (« =… », « +… »…).
  const sur = /^[=+\-@\t\r]/.test(t) && typeof v === "string" ? `'${t}` : t;
  return /[;"\n\r]/.test(sur) ? `"${sur.replaceAll('"', '""')}"` : sur;
};

/**
 * Registre au format CSV (séparateur « ; », montants entiers sans symbole, UTF-8 avec BOM
 * pour l'ouverture directe dans un tableur français).
 */
export function registreCsv(
  lignes: readonly LigneCsv[],
  regle: RegleComptable = REGLE_ACTUELLE,
): string {
  const entete = [
    "N°",
    "Date",
    "Catégorie",
    "Filiale",
    "Libellé",
    "Pièce",
    "Recette",
    "Dépense",
    "Caution",
    "Apport",
    "Mention",
  ];
  const corps = lignes.map((l) => {
    const c = colonneRegistre(
      {
        sens: l.sens,
        categorie: l.categorieCode,
        montant: l.montant,
        annuleMouvementId: l.annuleMouvementId,
      },
      regle,
    );
    const col = (nom: typeof c.colonne) => (c.colonne === nom ? c.montant : "");
    return [
      l.numero,
      l.date,
      l.categorie,
      l.filiale ?? "",
      l.libelle,
      l.piece,
      col("recette"),
      col("depense"),
      col("caution"),
      col("apport"),
      l.mention ?? "",
    ]
      .map(champCsv)
      .join(";");
  });
  return `﻿${[entete.join(";"), ...corps].join("\r\n")}\r\n`;
}
