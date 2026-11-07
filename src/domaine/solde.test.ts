import { describe, expect, it } from "vitest";
import demo from "../../docs/handoff/data/demo-semaine-43.json";
import { synthese } from "./comptabilite";
import { depuisHeureServeur } from "./dates";
import { semaineParNumero } from "./semaine";
import {
  categoriesDuSens,
  courbeSemaine,
  evolutionSolde,
  exigeJustificatif,
  filtrerHistorique,
  formaterMilliers,
  mentionReport,
  paginer,
  verifierContrePassation,
  verifierSaisieMouvement,
} from "./solde";
import type { CategorieMouvement, Sens } from "./types";

const PARIS = "Europe/Paris";
const NBSP = String.fromCharCode(0xa0);
const h = (t: string) => depuisHeureServeur(t, PARIS);
const maintenant = h(demo.maintenant);
const s43 = semaineParNumero(2026, 43, PARIS);
const mouvements = demo.mouvements.map((m) => ({
  numero: `2026-${m.numero}`,
  date: h(m.date),
  sens: m.sens as Sens,
  categorie: m.categorie as CategorieMouvement,
  montant: m.montant,
  motif: m.motif,
  contratNumero: m.contrat,
  saisiPar: m.saisiPar,
  justificatifNumero: m.justificatif,
}));

describe("page Solde (maquette 12)", () => {
  it("courbe : ouverture puis fin de chaque jour jusqu'à samedi 21:40", () => {
    const points = courbeSemaine(mouvements, 412380, s43, maintenant, PARIS);
    expect(points.map((p) => [p.libelle, p.solde])).toEqual([
      ["Ouv.", 412380],
      ["Lun", 403380],
      ["Mar", 445180],
      ["Mer", 437880],
      ["Jeu", 435580],
      ["Ven", 440730],
      ["Sam", 514630],
    ]);
    expect(points.at(-1)!.courant).toBe(true);
    expect(points.filter((p) => p.courant)).toHaveLength(1);
  });

  it("courbe d'une semaine passée (7 jours) et d'une semaine future (ouverture seule)", () => {
    const s42 = semaineParNumero(2026, 42, PARIS);
    expect(courbeSemaine([], 100, s42, maintenant, PARIS)).toHaveLength(8);
    const s44 = semaineParNumero(2026, 44, PARIS);
    expect(courbeSemaine([], 100, s44, maintenant, PARIS)).toEqual([
      { libelle: "Ouv.", solde: 100, courant: false },
    ]);
  });

  it("évolution et cartes Entrées / Sorties", () => {
    expect(evolutionSolde(412380, 514630).libelle).toBe(`+$102${NBSP}250 · +24,8${NBSP}%`);
    expect(evolutionSolde(1000, 900)).toMatchObject({ ecart: -100, hausse: false });
    expect(evolutionSolde(1000, 900).libelle).toBe(`−$100 · −10,0${NBSP}%`);
    expect(evolutionSolde(0, 50).libelle).toBe("+$50");
    const s = synthese(mouvements, 412380);
    expect([s.entrees, s.recettes, s.cautionsEncaissees]).toEqual([167400, 91400, 76000]);
    expect([s.sorties, s.depenses, s.cautionsRendues]).toEqual([65150, 24150, 41000]);
  });

  it("étiquettes de la courbe", () => {
    expect(formaterMilliers(514630)).toBe("514,6k");
    expect(formaterMilliers(412000)).toBe("412k");
    expect(formaterMilliers(-1500)).toBe("−1,5k");
  });

  it("recherche (sans accents) et filtre de catégorie", () => {
    expect(filtrerHistorique(mouvements, { q: "kerosene" }).map((m) => m.numero)).toEqual([
      "2026-OP-43-021",
    ]);
    expect(filtrerHistorique(mouvements, { q: "CTR-2026-0041" })).toHaveLength(2);
    expect(filtrerHistorique(mouvements, { q: "op-43-027" })).toHaveLength(1);
    expect(filtrerHistorique(mouvements, { categorie: "DIVERS" }).length).toBeGreaterThan(0);
    expect(
      filtrerHistorique(mouvements, { categorie: "DIVERS" }).every((m) => m.categorie === "DIVERS"),
    ).toBe(true);
    expect(filtrerHistorique(mouvements, {})).toHaveLength(35);
  });

  it("pagination « 1–15 sur 35 »", () => {
    expect(paginer(mouvements, 1, 15)).toMatchObject({ page: 1, pages: 3, libelle: "1–15 sur 35" });
    expect(paginer(mouvements, 3, 15).elements).toHaveLength(5);
    expect(paginer(mouvements, 3, 15).libelle).toBe("31–35 sur 35");
    expect(paginer(mouvements, 99, 15).page).toBe(3);
    expect(paginer(mouvements, Number.NaN, 15).page).toBe(1);
    expect(paginer([], 1, 15)).toMatchObject({ pages: 1, libelle: "0 sur 0" });
  });

  it("mention de report hors de la semaine d'imputation", () => {
    expect(mentionReport(h("2026-10-24T10:00"), s43, PARIS)).toBeNull();
    const s44 = semaineParNumero(2026, 44, PARIS);
    expect(mentionReport(h("2026-10-25T23:59"), s44, PARIS)).toBe("Reporté de S43");
  });
});

describe("saisie d'un mouvement (maquette 13)", () => {
  const base = {
    sens: "SORTIE" as Sens,
    categorie: "ENTRETIEN" as CategorieMouvement,
    montant: 2400,
    motif: "Révision des rotors du SuperVolito Carbon",
    date: h("2026-10-24T21:30"),
    avecJustificatif: true,
  };

  it("catégories proposées selon le sens", () => {
    expect(categoriesDuSens("ENTREE")).toEqual([
      "LOCATION",
      "PENALITE",
      "CAUTION_ENCAISSEE",
      "APPORT",
      "FORMATION",
      "VENTE_CARTES",
    ]);
    expect(categoriesDuSens("SORTIE")).toEqual([
      "CAUTION_RENDUE",
      "ACHAT_VEHICULE",
      "ENTRETIEN",
      "IMPOTS",
      "DIVERS",
      "ACHAT_STOCK",
    ]);
  });

  it("justificatif exigé pour toute dépense, pas pour une caution rendue ni un apport", () => {
    expect(exigeJustificatif("SORTIE", "ENTRETIEN")).toBe(true);
    expect(exigeJustificatif("SORTIE", "DIVERS")).toBe(true);
    expect(exigeJustificatif("SORTIE", "CAUTION_RENDUE")).toBe(false);
    expect(exigeJustificatif("ENTREE", "APPORT")).toBe(false);
  });

  it("règles de saisie", () => {
    expect(() => verifierSaisieMouvement(base, maintenant)).not.toThrow();
    expect(() => verifierSaisieMouvement({ ...base, avecJustificatif: false }, maintenant)).toThrow(
      "Justificatif obligatoire",
    );
    expect(() => verifierSaisieMouvement({ ...base, montant: 0 }, maintenant)).toThrow("Montant");
    expect(() => verifierSaisieMouvement({ ...base, montant: 12.5 }, maintenant)).toThrow(
      "Montant",
    );
    expect(() => verifierSaisieMouvement({ ...base, sens: "ENTREE" }, maintenant)).toThrow(
      "« Entretien » est une sortie",
    );
    expect(() =>
      verifierSaisieMouvement({ ...base, sens: "ENTREE", categorie: "CAUTION_RENDUE" }, maintenant),
    ).toThrow("est une sortie");
    expect(() => verifierSaisieMouvement({ ...base, categorie: "APPORT" }, maintenant)).toThrow(
      "est une entrée",
    );
    expect(() => verifierSaisieMouvement({ ...base, motif: " a " }, maintenant)).toThrow("Motif");
    expect(() =>
      verifierSaisieMouvement({ ...base, date: h("2026-10-24T21:45") }, maintenant),
    ).toThrow("futur");
  });

  it("contre-passation : ni mouvement de contrat, ni semaine clôturée", () => {
    const m = { numero: "2026-OP-43-027", automatique: false, semaineCloturee: false };
    expect(() => verifierContrePassation(m)).not.toThrow();
    expect(() => verifierContrePassation({ ...m, automatique: true })).toThrow(
      "annulez le contrat",
    );
    expect(() => verifierContrePassation({ ...m, semaineCloturee: true })).toThrow(
      "OP-43-027 appartient à une semaine clôturée",
    );
  });
});
