import { describe, expect, it } from "vitest";
import {
  champsModifiables,
  confirmationClotureValide,
  controlesAvantCloture,
  calculerImpot,
  montantSigne,
  natureMouvement,
  regleDe,
  preparerContrePassation,
  synthese,
  texteConfirmationCloture,
  type MouvementComptable,
} from "./comptabilite";
import { depuisHeureServeur } from "./dates";
import { semaineParNumero } from "./semaine";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);

let seq = 0;
const op = (m: Omit<MouvementComptable, "numero"> & { numero?: string }): MouvementComptable => ({
  numero: m.numero ?? `OP-43-${String(++seq).padStart(3, "0")}`,
  justificatifNumero: null,
  ...m,
});

describe("natures et signes", () => {
  const n = (categorie: string, sens: "ENTREE" | "SORTIE", regle: 1 | 2 = 2, annule?: string) =>
    natureMouvement({ categorie, sens, annuleMouvementId: annule }, regle);

  it("règle 1 : la catégorie fixe la nature (semaines clôturées avant la refonte)", () => {
    expect(n("LOCATION", "ENTREE", 1)).toBe("RECETTE");
    expect(n("PENALITE", "ENTREE", 1)).toBe("RECETTE");
    expect(n("DIVERS", "SORTIE", 1)).toBe("DEPENSE");
    expect(n("IMPOTS", "SORTIE", 1)).toBe("DEPENSE");
    expect(n("CAUTION_RENDUE", "SORTIE", 1)).toBe("CAUTION");
    expect(n("APPORT", "ENTREE", 1)).toBe("APPORT");
    // Catégorie inconnue de la règle 1 : le sens décide.
    expect(n("perso", "SORTIE", 1)).toBe("DEPENSE");
  });

  it("règle 2 : toute entrée est une recette, toute sortie une dépense, sauf les cautions", () => {
    expect(n("APPORT", "ENTREE")).toBe("RECETTE");
    expect(n("DIVERS", "ENTREE")).toBe("RECETTE");
    expect(n("perso", "SORTIE")).toBe("DEPENSE");
    expect(n("CAUTION_ENCAISSEE", "ENTREE")).toBe("CAUTION");
    expect(n("CAUTION_RENDUE", "SORTIE")).toBe("CAUTION");
  });

  it("règle 2 : une contre-passation garde la nature du mouvement annulé", () => {
    expect(n("LOCATION", "SORTIE", 2, "x")).toBe("RECETTE");
    expect(n("DIVERS", "ENTREE", 2, "x")).toBe("DEPENSE");
  });

  it("règle lue en base", () => {
    expect(regleDe(1)).toBe(1);
    expect(regleDe(2)).toBe(2);
    expect(regleDe(null)).toBe(2);
    expect(regleDe(undefined)).toBe(2);
  });

  it("signe du point de vue de la caisse", () => {
    expect(montantSigne({ sens: "ENTREE", montant: 300 })).toBe(300);
    expect(montantSigne({ sens: "SORTIE", montant: 300 })).toBe(-300);
  });
});

describe("synthese", () => {
  it("période vide", () => {
    expect(synthese([], 1000)).toMatchObject({
      solde: 1000,
      recettes: 0,
      depenses: 0,
      cautionsDetenues: 0,
      nombreOperations: 0,
    });
  });

  const semaineMixte = (): MouvementComptable[] => [
    op({ sens: "ENTREE", categorie: "CAUTION_ENCAISSEE", montant: 5000 }),
    op({ sens: "ENTREE", categorie: "LOCATION", montant: 2400 }),
    op({ sens: "ENTREE", categorie: "PENALITE", montant: 900 }),
    op({ sens: "SORTIE", categorie: "CAUTION_RENDUE", montant: 5000 }),
    op({ sens: "ENTREE", categorie: "APPORT", montant: 10000 }),
    op({ sens: "SORTIE", categorie: "ENTRETIEN", montant: 1200 }),
    op({ sens: "ENTREE", categorie: "CAUTION_ENCAISSEE", montant: 1000 }),
  ];

  it("règle 1 : cautions et apports exclus du résultat mais comptés dans le solde", () => {
    const s = synthese(semaineMixte(), 100, { regle: 1, tauxImpot: 20 });
    expect(s).toEqual({
      regle: 1,
      soldeOuverture: 100,
      entrees: 19300,
      sorties: 6200,
      recettes: 3300,
      depenses: 1200,
      baseImposable: 2100,
      tauxImpot: null,
      impotDu: null,
      cautionsEncaissees: 6000,
      cautionsRendues: 5000,
      cautionsDetenues: 1000,
      apports: 10000,
      solde: 13200,
      nombreOperations: 7,
    });
  });

  it("règle 2 : apports en recettes, impôt sur les recettes, cautions à part", () => {
    const s = synthese(semaineMixte(), 100, { tauxImpot: 20 });
    expect(s).toMatchObject({
      regle: 2,
      recettes: 13300,
      depenses: 1200,
      baseImposable: 13300,
      tauxImpot: 20,
      impotDu: 2660,
      cautionsDetenues: 1000,
      apports: 0,
      solde: 13200,
    });
    // Sans taux fourni, pas d'impôt calculé.
    expect(synthese(semaineMixte(), 100).impotDu).toBeNull();
  });

  it("impôt : arrondi au dollar, jamais négatif, taux entier de 0 à 100", () => {
    expect(calculerImpot(91400, 20)).toBe(18280);
    expect(calculerImpot(1003, 20)).toBe(201);
    expect(calculerImpot(-500, 20)).toBe(0);
    expect(calculerImpot(1000, 0)).toBe(0);
    expect(() => calculerImpot(1000, 101)).toThrow("Taux");
    expect(() => calculerImpot(1000, 12.5)).toThrow("Taux");
  });

  it("cautions détenues reportées d'une semaine à l'autre", () => {
    const s = synthese(
      [op({ sens: "SORTIE", categorie: "CAUTION_RENDUE", montant: 15000 })],
      50000,
      {
        cautionsDetenuesOuverture: 35000,
      },
    );
    expect(s.cautionsDetenues).toBe(20000);
    expect(s.solde).toBe(35000);
  });

  it("une contre-passation est neutre", () => {
    const location = op({ sens: "ENTREE", categorie: "LOCATION", montant: 2400, id: "a" });
    const depense = op({ sens: "SORTIE", categorie: "DIVERS", montant: 850, id: "b" });
    const caution = op({ sens: "ENTREE", categorie: "CAUTION_ENCAISSEE", montant: 5000, id: "c" });
    const base = synthese([], 1000);
    const avecAnnulations = (regle: 1 | 2) =>
      synthese(
        [
          location,
          op({ ...preparerContrePassation({ ...location, id: "a" }, false) }),
          depense,
          op({ ...preparerContrePassation({ ...depense, id: "b" }, false) }),
          caution,
          op({ ...preparerContrePassation({ ...caution, id: "c" }, false) }),
        ],
        1000,
        { regle, tauxImpot: 20 },
      );
    for (const regle of [1, 2] as const) {
      expect(avecAnnulations(regle)).toMatchObject({
        recettes: base.recettes,
        depenses: base.depenses,
        baseImposable: 0,
        cautionsDetenues: 0,
        solde: base.solde,
      });
    }
  });

  it("refuse un montant invalide", () => {
    expect(() =>
      synthese([op({ sens: "ENTREE", categorie: "LOCATION", montant: -1 })], 0),
    ).toThrow();
  });
});

describe("controlesAvantCloture", () => {
  const s43 = { ...semaineParNumero(2026, 43, PARIS), statut: "OUVERTE" as const };
  const mouvements: MouvementComptable[] = [
    {
      numero: "OP-43-001",
      sens: "SORTIE",
      categorie: "IMPOTS",
      montant: 100,
      justificatifNumero: "JUST-43-01",
      justificatifRequis: true,
    },
    { numero: "OP-43-002", sens: "ENTREE", categorie: "LOCATION", montant: 300 },
    {
      numero: "OP-43-003",
      sens: "SORTIE",
      categorie: "ENTRETIEN",
      montant: 50,
      justificatifNumero: "JUST-43-02",
      justificatifRequis: true,
    },
  ];
  const base = {
    semaine: s43,
    mouvements,
    soldeOuverture: 1000,
    soldeConstate: 1150,
    contratsEnCours: [],
    semainePrecedenteCloturee: true,
    maintenant: h("2026-10-25T10:00"),
    fuseau: PARIS,
    heuresAvantFinCloture: 24,
  };

  it("tout est en ordre → clôturable", () => {
    const r = controlesAvantCloture(base);
    expect(r.cloturable).toBe(true);
    expect(r.controles.map((c) => [c.cle, c.niveau, c.message])).toEqual([
      ["justificatifs", "ok", "2 / 2 dépenses justifiées"],
      ["numerotation", "ok", "3 opérations numérotées, sans trou"],
      ["solde", "ok", "Solde rapproché : $1 150"],
      ["contrats", "ok", "Aucun contrat en cours"],
    ]);
  });

  it("dépense sans justificatif → bloquant", () => {
    const r = controlesAvantCloture({
      ...base,
      mouvements: [
        ...mouvements,
        {
          numero: "OP-43-004",
          sens: "SORTIE",
          categorie: "DIVERS",
          montant: 50,
          justificatifRequis: true,
        },
      ],
      soldeConstate: 1100,
    });
    expect(r.cloturable).toBe(false);
    expect(r.controles[0]).toEqual({
      cle: "justificatifs",
      niveau: "bloquant",
      message: "2 / 3 dépenses justifiées : OP-43-004 sans justificatif",
    });
  });

  it("règle 2 : une catégorie sans justificatif obligatoire n'en demande pas", () => {
    const r = controlesAvantCloture({
      ...base,
      mouvements: [
        ...mouvements,
        { numero: "OP-43-004", sens: "SORTIE", categorie: "perso", montant: 50 },
      ],
      soldeConstate: 1100,
    });
    expect(r.cloturable).toBe(true);
    expect(r.controles[0].message).toBe("2 / 2 dépenses justifiées");
  });

  it("règle 1 : toute dépense doit être justifiée", () => {
    const r = controlesAvantCloture({
      ...base,
      regle: 1,
      mouvements: [
        ...mouvements,
        { numero: "OP-43-004", sens: "SORTIE", categorie: "DIVERS", montant: 50 },
      ],
      soldeConstate: 1100,
    });
    expect(r.controles[0].niveau).toBe("bloquant");
  });

  it("une contre-passation de dépense ne demande pas de justificatif", () => {
    const r = controlesAvantCloture({
      ...base,
      mouvements: [
        ...mouvements,
        {
          numero: "OP-43-004",
          sens: "ENTREE",
          categorie: "ENTRETIEN",
          montant: 50,
          annuleMouvementId: "x",
        },
      ],
      soldeConstate: 1200,
    });
    expect(r.cloturable).toBe(true);
  });

  it("numérotation : trou, doublon, autre semaine", () => {
    const r = controlesAvantCloture({
      ...base,
      mouvements: [
        { numero: "OP-43-001", sens: "ENTREE", categorie: "LOCATION", montant: 300 },
        { numero: "OP-43-001", sens: "ENTREE", categorie: "LOCATION", montant: 300 },
        { numero: "OP-42-003", sens: "ENTREE", categorie: "LOCATION", montant: 300 },
        { numero: "2026-OP-43-005", sens: "ENTREE", categorie: "LOCATION", montant: 300 },
      ],
      soldeConstate: 2200,
    });
    const numerotation = r.controles.find((c) => c.cle === "numerotation");
    expect(numerotation?.niveau).toBe("bloquant");
    expect(numerotation?.message).toBe(
      "Numérotation à vérifier : OP-43-001 en double, OP-42-003 hors séquence, OP-43-002 manquant, OP-43-003 manquant, OP-43-004 manquant",
    );
  });

  it("écart de solde → bloquant", () => {
    const r = controlesAvantCloture({ ...base, soldeConstate: 1149 });
    expect(r.controles.find((c) => c.cle === "solde")).toEqual({
      cle: "solde",
      niveau: "bloquant",
      message: "Écart de solde : registre $1 150, constaté $1 149",
    });
  });

  it("contrats en cours : informatif, avec les retards", () => {
    const r = controlesAvantCloture({
      ...base,
      contratsEnCours: [
        { numero: "CTR-2026-0039", finPrevue: h("2026-10-25T09:00") },
        { numero: "CTR-2026-0040", finPrevue: h("2026-10-25T12:00") },
      ],
    });
    expect(r.cloturable).toBe(true);
    expect(r.controles.at(-1)).toEqual({
      cle: "contrats",
      niveau: "info",
      message: "2 contrats encore en cours, dont 1 en retard",
    });
    const un = controlesAvantCloture({
      ...base,
      contratsEnCours: [{ numero: "CTR-2026-0040", finPrevue: h("2026-10-25T12:00") }],
    });
    expect(un.controles.at(-1)?.message).toBe("1 contrat encore en cours");
  });

  it("trop tôt, semaine précédente ouverte, déjà clôturée → bloquants", () => {
    const r = controlesAvantCloture({
      ...base,
      semaine: { ...s43, statut: "CLOTUREE" },
      semainePrecedenteCloturee: false,
      maintenant: h("2026-10-24T21:40"),
    });
    expect(r.cloturable).toBe(false);
    expect(r.controles.slice(0, 3)).toEqual([
      { cle: "statut", niveau: "bloquant", message: "Semaine déjà clôturée" },
      {
        cle: "semainePrecedente",
        niveau: "bloquant",
        message: "La semaine 42 doit d'abord être clôturée",
      },
      {
        cle: "date",
        niveau: "bloquant",
        message: "Clôture possible à partir du dimanche 25/10 à 00:00",
      },
    ]);
  });

  it("semaine vide", () => {
    const r = controlesAvantCloture({ ...base, mouvements: [], soldeConstate: 1000 });
    expect(r.controles.slice(0, 2).map((c) => c.message)).toEqual([
      "Aucune dépense à justifier",
      "Aucune opération enregistrée",
    ]);
    const une = controlesAvantCloture({
      ...base,
      mouvements: mouvements.slice(1, 2),
      soldeConstate: 1300,
    });
    expect(une.controles.find((c) => c.cle === "numerotation")?.niveau).toBe("bloquant");
    const seule = controlesAvantCloture({
      ...base,
      mouvements: [
        {
          numero: "OP-43-001",
          sens: "SORTIE",
          categorie: "IMPOTS",
          montant: 100,
          justificatifNumero: "J",
          justificatifRequis: true,
        },
      ],
      soldeConstate: 900,
    });
    expect(seule.controles.slice(0, 2).map((c) => c.message)).toEqual([
      "1 / 1 dépense justifiée",
      "1 opération numérotée, sans trou",
    ]);
  });
});

describe("confirmation de clôture", () => {
  it("texte attendu", () => {
    expect(texteConfirmationCloture(43)).toBe("CLÔTURER S43");
    expect(texteConfirmationCloture(1)).toBe("CLÔTURER S01");
  });

  it("validation de la saisie", () => {
    expect(confirmationClotureValide("CLÔTURER S43", 43)).toBe(true);
    expect(confirmationClotureValide("  CLÔTURER   S43 ", 43)).toBe(true);
    expect(confirmationClotureValide("CLÔTURER S43", 43)).toBe(true); // Ô décomposé
    expect(confirmationClotureValide("clôturer s43", 43)).toBe(false);
    expect(confirmationClotureValide("CLOTURER S43", 43)).toBe(false);
    expect(confirmationClotureValide("CLÔTURER S42", 43)).toBe(false);
  });
});

describe("corrections", () => {
  it("seuls le motif et le justificatif d'un mouvement manuel d'une semaine ouverte", () => {
    expect(champsModifiables({ automatique: false }, "OUVERTE")).toEqual(["motif", "justificatif"]);
    expect(champsModifiables({ automatique: true }, "OUVERTE")).toEqual([]);
    expect(champsModifiables({ automatique: false }, "CLOTUREE")).toEqual([]);
  });

  it("contre-passation", () => {
    const m = {
      id: "m12",
      numero: "2026-OP-43-012",
      sens: "SORTIE" as const,
      categorie: "CAUTION_RENDUE" as const,
      montant: 15000,
    };
    expect(preparerContrePassation(m, false)).toEqual({
      sens: "ENTREE",
      categorie: "CAUTION_RENDUE",
      montant: 15000,
      annuleMouvementId: "m12",
      motif: "Annulation de OP-43-012",
    });
    expect(() => preparerContrePassation(m, true)).toThrow(/déjà annulé/);
    expect(() => preparerContrePassation({ ...m, annuleMouvementId: "x" }, false)).toThrow(
      /ne peut pas être annulée/,
    );
  });
});
