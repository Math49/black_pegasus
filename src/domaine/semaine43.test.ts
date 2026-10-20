// Test d'intégration : les données de démonstration (docs/handoff/data) doivent redonner
// exactement les chiffres des maquettes.
import { describe, expect, it } from "vitest";
import demo from "../../docs/handoff/data/demo-semaine-43.json";
import flotte from "../../docs/handoff/data/flotte.json";
import { controlesAvantCloture, synthese, type MouvementComptable } from "./comptabilite";
import { depuisHeureServeur } from "./dates";
import { calculerRetard, estEnRetard, minutesDepassement } from "./retard";
import { semaineDe, semaineParNumero } from "./semaine";
import { calculerTarif } from "./tarif";
import type { CategorieMouvement, Sens } from "./types";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);
const maintenant = h(demo.maintenant);
const { parametres } = demo;
const [s42, s43] = demo.semaines;

const mouvements: MouvementComptable[] = demo.mouvements.map((m) => ({
  numero: m.numero,
  sens: m.sens as Sens,
  categorie: m.categorie as CategorieMouvement,
  montant: m.montant,
  justificatifNumero: m.justificatif,
}));

const vehiculeDe = (immatriculation: string) => {
  const v = flotte.vehicules.find((v) =>
    v.exemplaires.some((e) => e.immatriculation === immatriculation),
  );
  if (!v) throw new Error(`Exemplaire inconnu : ${immatriculation}`);
  return v;
};

describe("semaine 43 de démonstration", () => {
  it("synthèse : $91 400 / $24 150 / $67 250 / $35 000 / $514 630", () => {
    const s = synthese(mouvements, s43.soldeOuverture);
    expect(s).toMatchObject({
      soldeOuverture: 412380,
      recettes: 91400,
      depenses: 24150,
      resultatImposable: 67250,
      cautionsDetenues: 35000,
      apports: 0,
      solde: 514630,
      nombreOperations: 35,
    });
    expect(s).toMatchObject({
      recettes: s43.recettes,
      depenses: s43.depenses,
      resultatImposable: s43.resultatImposable,
      cautionsDetenues: s43.cautionsDetenues,
      solde: s43.soldeActuel,
    });
  });

  it("S42 : solde de clôture = solde d'ouverture de S43", () => {
    expect(s42.soldeOuverture + s42.resultatImposable).toBe(s42.soldeCloture);
    expect(s42.soldeCloture).toBe(s43.soldeOuverture);
  });

  it("cautions détenues = cautions des 5 contrats en cours", () => {
    const enCours = demo.contrats.filter((c) => c.statut === "EN_COURS");
    expect(enCours).toHaveLength(5);
    expect(enCours.reduce((t, c) => t + c.caution, 0)).toBe(35000);
  });

  it("toutes les opérations sont datées dans la S43", () => {
    for (const m of demo.mouvements) expect(semaineDe(h(m.date), PARIS).id).toBe("2026-S43");
    expect(semaineParNumero(2026, 43, PARIS).debut).toEqual(h(s43.debut));
  });

  it.each(demo.contrats.map((c) => [c.numero, c] as const))("%s : tarif recalculé", (_, c) => {
    const v = vehiculeDe(c.exemplaire);
    const t = calculerTarif({
      debut: h(c.debut),
      fin: h(c.finPrevue),
      prixHeure: v.prixHeure,
      prixJour: v.prixJour,
      fuseau: PARIS,
    });
    expect({ heures: t.heures, montant: t.montant, tarifApplique: t.tarifApplique }).toEqual({
      heures: c.heuresFacturees,
      montant: c.montantLocation,
      tarifApplique: c.tarifApplique,
    });
    expect(c.caution).toBe(v.caution);
  });

  it.each(demo.contrats.filter((c) => c.retourReel).map((c) => [c.numero, c] as const))(
    "%s : pénalité de retard recalculée",
    (_, c) => {
      const r = calculerRetard({
        finPrevue: h(c.finPrevue),
        retourReel: h(c.retourReel!),
        prixHeure: vehiculeDe(c.exemplaire).prixHeure,
        toleranceMin: parametres.toleranceRetardMin,
        majoration: parametres.majorationRetard,
        seuilDefautRestitutionMin: 180,
        fuseau: PARIS,
      });
      expect(r.penalite).toBe(c.penaliteRetard);
    },
  );

  it("contrats en cours à 21:40 : CTR-2026-0039 seul en retard, de 40 min", () => {
    const enRetard = demo.contrats
      .filter((c) => c.statut === "EN_COURS" && estEnRetard(h(c.finPrevue), maintenant))
      .map((c) => [c.numero, minutesDepassement(h(c.finPrevue), maintenant, PARIS)]);
    expect(enRetard).toEqual([["CTR-2026-0039", 40]]);
  });

  it("contrôles avant clôture (maquette 19) au dimanche 00:00", () => {
    const enCours = demo.contrats
      .filter((c) => c.statut === "EN_COURS")
      .map((c) => ({ numero: c.numero, finPrevue: h(c.finPrevue) }));
    const commun = {
      semaine: { ...semaineParNumero(2026, 43, PARIS), statut: "OUVERTE" as const },
      mouvements,
      soldeOuverture: s43.soldeOuverture,
      soldeConstate: 514630,
      contratsEnCours: enCours,
      semainePrecedenteCloturee: true,
      fuseau: PARIS,
      heuresAvantFinCloture: 24,
    };

    // Samedi 21:40 (« maintenant » des maquettes) : mêmes messages que la maquette 19,
    // mais la clôture n'ouvre qu'au dimanche 00:00 (valeur par défaut de D4).
    const samedi = controlesAvantCloture({ ...commun, maintenant });
    expect(samedi.cloturable).toBe(false);
    expect(samedi.controles.map((c) => c.message)).toEqual([
      "Clôture possible à partir du dimanche 25/10 à 00:00",
      "5 / 5 dépenses justifiées",
      "35 opérations numérotées, sans trou",
      "Solde rapproché : $514 630",
      "5 contrats encore en cours, dont 1 en retard",
    ]);

    const dimanche = controlesAvantCloture({ ...commun, maintenant: h("2026-10-25T00:00") });
    expect(dimanche.cloturable).toBe(true);
    expect(dimanche.controles.at(-1)?.message).toBe("5 contrats encore en cours, dont 3 en retard");
  });
});
