import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TZDate } from "@date-fns/tz";
import { exigerMontant, formaterDollars } from "./argent";
import { versHeureServeur } from "./dates";
import { totalDegats } from "./degats";
import { formaterDuree } from "./notifications";
import { calculerRetard, estEnRetard, minutesDepassement, type ResultatRetard } from "./retard";
import type { ResultatTarif } from "./tarif";
import type { CategorieMouvement, ForfaitDegats, Sens } from "./types";

// Contrats : mouvements générés, bilan de clôture, échéances (HANDOFF § 5.5 et § 7,
// CONCEPTION § 6.1 et § 6.2). Mêmes fonctions pour l'aperçu à l'écran et l'enregistrement.

export type MouvementPrevu = {
  sens: Sens;
  categorie: CategorieMouvement;
  montant: number;
  motif: string;
};

/** Mouvements automatiques de la signature, dans l'ordre des maquettes : caution puis location. */
export function mouvementsCreation(p: {
  vehiculeNom: string;
  clientNom: string;
  caution: number;
  tarif: ResultatTarif;
}): MouvementPrevu[] {
  const location = `${p.vehiculeNom} · ${p.tarif.heures} h${p.tarif.tarifApplique === "JOURNALIER" ? ", tarif journalier" : ""}`;
  return [
    ...(p.caution > 0
      ? [
          {
            sens: "ENTREE" as const,
            categorie: "CAUTION_ENCAISSEE" as const,
            montant: p.caution,
            motif: `${p.vehiculeNom} · ${p.clientNom}`,
          },
        ]
      : []),
    { sens: "ENTREE", categorie: "LOCATION", montant: p.tarif.montant, motif: location },
  ];
}

export type BilanCloture = {
  retard: ResultatRetard;
  degats: ForfaitDegats[];
  penaliteDegats: number;
  /** Pénalités à encaisser à part (retard + dégâts). */
  penalites: number;
  /** Caution remise en main propre au client. */
  cautionRestituee: number;
  /** Reste dû par le client si les pénalités dépassent la caution (mode « retenue sur caution »). */
  resteADu: number;
  mouvements: MouvementPrevu[];
};

/**
 * Bilan de clôture. Par défaut (décision D2), la caution est rendue intégralement et les
 * pénalités sont encaissées à part. Avec `penalitesSurCaution`, la caution remise est diminuée
 * des pénalités ; les mouvements restent identiques (caution intégralement sortie de la caisse
 * des cautions, pénalités en recettes), seul le montant remis au client change.
 */
export function bilanCloture(p: {
  contrat: { vehiculeNom: string; prixHeure: number; caution: number; finPrevue: Date };
  retourReel: Date;
  forfaitsCoches: readonly ForfaitDegats[];
  regles: {
    toleranceRetardMin: number;
    majorationRetard: number;
    seuilDefautRestitutionMin: number;
    penalitesSurCaution: boolean;
  };
  fuseau: string;
}): BilanCloture {
  exigerMontant(p.contrat.caution, "Caution");
  const retard = calculerRetard({
    finPrevue: p.contrat.finPrevue,
    retourReel: p.retourReel,
    prixHeure: p.contrat.prixHeure,
    toleranceMin: p.regles.toleranceRetardMin,
    majoration: p.regles.majorationRetard,
    seuilDefautRestitutionMin: p.regles.seuilDefautRestitutionMin,
    fuseau: p.fuseau,
  });
  const degats = p.forfaitsCoches.map((f) => ({ libelle: f.libelle, montant: f.montant }));
  const penaliteDegats = totalDegats(degats);
  const penalites = retard.penalite + penaliteDegats;
  const retenue = p.regles.penalitesSurCaution ? Math.min(penalites, p.contrat.caution) : 0;

  const mouvements: MouvementPrevu[] = [];
  if (retard.penalite > 0) {
    mouvements.push({
      sens: "ENTREE",
      categorie: "PENALITE",
      montant: retard.penalite,
      motif: `Retard de ${formaterDuree(retard.minutes)} (${retard.heuresFacturees} h facturée${retard.heuresFacturees > 1 ? "s" : ""})`,
    });
  }
  if (penaliteDegats > 0) {
    mouvements.push({
      sens: "ENTREE",
      categorie: "PENALITE",
      montant: penaliteDegats,
      motif: `Dégâts : ${degats.map((d) => d.libelle).join(", ")}`,
    });
  }
  if (p.contrat.caution > 0) {
    mouvements.push({
      sens: "SORTIE",
      categorie: "CAUTION_RENDUE",
      montant: p.contrat.caution,
      motif: `${p.contrat.vehiculeNom} restitué`,
    });
  }
  return {
    retard,
    degats,
    penaliteDegats,
    penalites,
    cautionRestituee: p.contrat.caution - retenue,
    resteADu: p.regles.penalitesSurCaution ? penalites - retenue : penalites,
    mouvements,
  };
}

// ── Échéances et affichage ─────────────────────────────────────────────────

export type Echeance = { ton: "alerte" | "ok" | "attenue"; libelle: string; enRetard: boolean };

/** « Retard · 40 min », « Dans 20 min » (moins d'une heure), « Dans 1 h 20 ». */
export function echeance(finPrevue: Date, maintenant: Date, fuseau: string): Echeance {
  if (estEnRetard(finPrevue, maintenant)) {
    return {
      ton: "alerte",
      libelle: `Retard · ${formaterDuree(minutesDepassement(finPrevue, maintenant, fuseau))}`,
      enRetard: true,
    };
  }
  const restant = minutesDepassement(maintenant, finPrevue, fuseau);
  return {
    ton: restant < 60 ? "ok" : "attenue",
    libelle: `Dans ${formaterDuree(restant)}`,
    enRetard: false,
  };
}

const capitale = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** « Sam. 24/10 · 21:00 » à l'heure du serveur. */
export const formaterJourHeure = (instant: Date, fuseau: string) =>
  capitale(format(versHeureServeur(instant, fuseau), "EEE dd/MM '·' HH:mm", { locale: fr }));

/** « Samedi 24/10/2026 · 22:00 » (PDF du contrat). */
export const formaterDateComplete = (instant: Date, fuseau: string) =>
  capitale(format(versHeureServeur(instant, fuseau), "EEEE dd/MM/yyyy '·' HH:mm", { locale: fr }));

/** Ajoute des heures d'horloge (durées rapides du formulaire : 22:00 + 12 h = 10:00). */
export function ajouterHeuresHorloge(instant: Date, heures: number, fuseau: string): Date {
  const d = new TZDate(instant.getTime(), fuseau);
  d.setHours(d.getHours() + heures);
  return new Date(d.getTime());
}

/** Libellés du tableau de tarification (récapitulatif et PDF). */
export function lignesTarification(
  t: ResultatTarif,
  prixHeure: number,
  prixJour: number,
  /** « 1 jour » en toutes lettres (PDF) plutôt que « 1 j » (écran). */
  enLettres = false,
) {
  const jours = Math.max(1, Math.floor(t.heures / 24));
  const reste = t.heures >= 24 ? t.heures % 24 : 0;
  const unite = enLettres ? (jours > 1 ? " jours" : " jour") : " j";
  const detailJour = `${jours}${unite} × ${formaterDollars(prixJour)}${reste > 0 ? ` + ${reste} h` : ""}`;
  return {
    horaire: {
      detail: `${t.heures} h × ${formaterDollars(prixHeure)}`,
      montant: t.horaire,
      applique: t.tarifApplique === "HORAIRE",
    },
    journalier: {
      detail: detailJour,
      montant: t.journalier,
      applique: t.tarifApplique === "JOURNALIER",
    },
  };
}
