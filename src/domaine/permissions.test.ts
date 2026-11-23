import { describe, expect, it } from "vitest";
import {
  ACTIONS,
  pageAccueilPanel,
  peut,
  verifierModificationCompte,
  type Action,
} from "./permissions";

describe("peut (HANDOFF § 7.9)", () => {
  const tableau: [Action, boolean, boolean][] = [
    // action, administrateur, gestionnaire
    ["tableauDeBord.consulter", true, true],
    ["contrat.consulter", true, true],
    ["vehicule.consulter", true, true],
    ["solde.consulter", true, true],
    ["contrat.creer", true, true],
    ["contrat.cloturer", true, true],
    ["contrat.pdf", true, true],
    ["contrat.annuler", true, false],
    ["vehicule.creer", true, true],
    ["vehicule.modifier", true, true],
    ["vehicule.supprimer", true, false],
    ["mouvement.creer", true, true],
    ["mouvement.modifier", true, true],
    ["mouvement.contrePasser", true, false],
    ["comptabilite.consulter", true, true],
    ["comptabilite.exporterCsv", true, true],
    ["declaration.brouillon", true, true],
    ["declaration.exporter", true, false],
    ["semaine.cloturer", true, false],
    ["compte.gerer", true, false],
    ["journal.consulter", true, false],
    ["parametres.gerer", true, false],
    ["formation.gerer", true, true],
    ["demande.consulter", true, true],
    ["cards.gerer", true, true],
    ["vente.consulter", true, true],
    ["vente.creer", true, true],
    ["vente.annuler", true, false],
    ["enchere.gerer", true, true],
    ["enchere.ecarter", true, false],
  ];

  it.each(tableau)("%s : admin %s, gestionnaire %s", (action, admin, gestionnaire) => {
    expect(peut("ADMIN", action)).toBe(admin);
    expect(peut("GESTIONNAIRE", action)).toBe(gestionnaire);
  });

  it("le tableau couvre toutes les actions", () => {
    expect(tableau.map(([a]) => a).sort()).toEqual([...ACTIONS].sort());
  });
});

describe("verifierModificationCompte", () => {
  it("le FISC n’accède ni à la gestion de Formation ni aux demandes", () => {
    expect(peut("FISC", "formation.gerer")).toBe(false);
    expect(peut("FISC", "demande.consulter")).toBe(false);
  });
  const admin = { id: "a1", role: "ADMIN" as const };
  const gestionnaire = { id: "g1", role: "GESTIONNAIRE" as const };
  const cibleAdmin = { id: "a1", role: "ADMIN" as const, actif: true };
  const autreAdmin = { id: "a2", role: "ADMIN" as const, actif: true };
  const cibleGest = { id: "g1", role: "GESTIONNAIRE" as const, actif: true };

  const verifier = (p: Partial<Parameters<typeof verifierModificationCompte>[0]>) => () =>
    verifierModificationCompte({
      acteur: admin,
      cible: cibleGest,
      modification: {},
      adminsActifs: 2,
      ...p,
    });

  it("un gestionnaire ne gère pas les comptes", () => {
    expect(verifier({ acteur: gestionnaire, modification: { actif: false } })).toThrow(
      /administrateur/,
    );
  });

  it("un administrateur ne peut pas se désactiver", () => {
    expect(verifier({ cible: cibleAdmin, modification: { actif: false } })).toThrow(
      /propre compte/,
    );
  });

  it("un administrateur ne peut pas se rétrograder", () => {
    expect(verifier({ cible: cibleAdmin, modification: { role: "GESTIONNAIRE" } })).toThrow(
      /propre rôle/,
    );
  });

  it("il reste toujours un administrateur actif", () => {
    expect(
      verifier({ cible: autreAdmin, modification: { actif: false }, adminsActifs: 1 }),
    ).toThrow(/au moins un administrateur/);
    expect(
      verifier({ cible: autreAdmin, modification: { role: "GESTIONNAIRE" }, adminsActifs: 1 }),
    ).toThrow(/au moins un administrateur/);
  });

  it("modifications permises", () => {
    expect(verifier({ modification: { actif: false } })).not.toThrow();
    expect(verifier({ modification: { role: "ADMIN" } })).not.toThrow();
    expect(
      verifier({ cible: autreAdmin, modification: { actif: false }, adminsActifs: 2 }),
    ).not.toThrow();
    expect(
      verifier({ cible: cibleAdmin, modification: { actif: true, role: "ADMIN" } }),
    ).not.toThrow();
    expect(
      verifier({
        cible: { ...autreAdmin, actif: false },
        modification: { actif: true },
        adminsActifs: 1,
      }),
    ).not.toThrow();
  });
});

describe("rôle FISC (consultation seule)", () => {
  it("consulte contrats, solde et comptabilité, sans rien modifier", () => {
    for (const a of [
      "contrat.consulter",
      "contrat.pdf",
      "solde.consulter",
      "comptabilite.consulter",
      "comptabilite.exporterCsv",
      "declaration.brouillon",
      "declaration.exporter",
      "vente.consulter",
    ] as const)
      expect(peut("FISC", a), a).toBe(true);
    for (const a of ACTIONS.filter(
      (x) =>
        !x.endsWith(".consulter") &&
        ![
          "contrat.pdf",
          "comptabilite.exporterCsv",
          "declaration.brouillon",
          "declaration.exporter",
        ].includes(x),
    ))
      expect(peut("FISC", a), a).toBe(false);
    expect(peut("FISC", "tableauDeBord.consulter")).toBe(false);
    expect(peut("FISC", "vehicule.consulter")).toBe(false);
  });

  it("page d'arrivée du panel", () => {
    expect(pageAccueilPanel("ADMIN")).toBe("/admin");
    expect(pageAccueilPanel("GESTIONNAIRE")).toBe("/admin");
    expect(pageAccueilPanel("FISC")).toBe("/admin/comptabilite");
  });

  it("passer le dernier administrateur en FISC est refusé, comme en gestionnaire", () => {
    expect(() =>
      verifierModificationCompte({
        acteur: { id: "a", role: "ADMIN" },
        cible: { id: "b", role: "ADMIN", actif: true },
        modification: { role: "FISC" },
        adminsActifs: 1,
      }),
    ).toThrow("au moins un administrateur");
    expect(() =>
      verifierModificationCompte({
        acteur: { id: "a", role: "ADMIN" },
        cible: { id: "a", role: "ADMIN", actif: true },
        modification: { role: "FISC" },
        adminsActifs: 3,
      }),
    ).toThrow("propre rôle");
  });
});
