import { describe, expect, it } from "vitest";
import {
  champsModifiables,
  confirmationClotureValide,
  controlesAvantCloture,
  montantSigne,
  natureMouvement,
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
  it("classe les catégories", () => {
    expect(natureMouvement("LOCATION")).toBe("RECETTE");
    expect(natureMouvement("PENALITE")).toBe("RECETTE");
    expect(natureMouvement("DIVERS")).toBe("DEPENSE");
    expect(natureMouvement("IMPOTS")).toBe("DEPENSE");
    expect(natureMouvement("CAUTION_RENDUE")).toBe("CAUTION");
    expect(natureMouvement("APPORT")).toBe("APPORT");
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

  it("cautions et apports exclus du résultat mais comptés dans le solde", () => {
    const s = synthese(
      [
        op({ sens: "ENTREE", categorie: "CAUTION_ENCAISSEE", montant: 5000 }),
        op({ sens: "ENTREE", categorie: "LOCATION", montant: 2400 }),
        op({ sens: "ENTREE", categorie: "PENALITE", montant: 900 }),
        op({ sens: "SORTIE", categorie: "CAUTION_RENDUE", montant: 5000 }),
        op({ sens: "ENTREE", categorie: "APPORT", montant: 10000 }),
        op({ sens: "SORTIE", categorie: "ENTRETIEN", montant: 1200 }),
        op({ sens: "ENTREE", categorie: "CAUTION_ENCAISSEE", montant: 1000 }),
      ],
      100,
    );
    expect(s).toEqual({
      soldeOuverture: 100,
      entrees: 19300,
      sorties: 6200,
      recettes: 3300,
      depenses: 1200,
      resultatImposable: 2100,
      cautionsEncaissees: 6000,
      cautionsRendues: 5000,
      cautionsDetenues: 1000,
      apports: 10000,
      solde: 13200,
      nombreOperations: 7,
    });
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
    const avecAnnulations = synthese(
      [
        location,
        op({ ...preparerContrePassation({ ...location, id: "a" }, false) }),
        depense,
        op({ ...preparerContrePassation({ ...depense, id: "b" }, false) }),
        caution,
        op({ ...preparerContrePassation({ ...caution, id: "c" }, false) }),
      ],
      1000,
    );
    expect(avecAnnulations).toMatchObject({
      recettes: base.recettes,
      depenses: base.depenses,
      resultatImposable: 0,
      cautionsDetenues: 0,
      solde: base.solde,
    });
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
    },
    { numero: "OP-43-002", sens: "ENTREE", categorie: "LOCATION", montant: 300 },
    {
      numero: "OP-43-003",
      sens: "SORTIE",
      categorie: "ENTRETIEN",
      montant: 50,
      justificatifNumero: "JUST-43-02",
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
        { numero: "OP-43-004", sens: "SORTIE", categorie: "DIVERS", montant: 50 },
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
