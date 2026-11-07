import { describe, expect, it } from "vitest";
import {
  filialeImposee,
  filialeParDefaut,
  filtrerParFiliale,
  libelleFiliale,
  libelleFiltreFiliale,
  lireFiltreFiliale,
  SLUGS_FILIALE,
  verifierFilialeMouvement,
} from "./filiales";
import type { CategorieMouvement, CodeFiliale } from "./types";
import { exigeJustificatif, categoriesDuSens } from "./solde";
import {
  colonneRegistre,
  pieceAbregee,
  synthese,
  syntheseParFiliale,
  ventilation,
} from "./comptabilite";

describe("filiales", () => {
  it("libellés, « Groupe » pour les frais communs", () => {
    expect(libelleFiliale("BPL")).toBe("Location");
    expect(libelleFiliale("BPF")).toBe("Formation");
    expect(libelleFiliale("BPC")).toBe("Cards");
    expect(libelleFiliale(null)).toBe("Groupe");
  });

  it("filiale proposée selon la catégorie", () => {
    expect(filialeParDefaut("LOCATION")).toBe("BPL");
    expect(filialeParDefaut("ENTRETIEN")).toBe("BPL");
    expect(filialeParDefaut("FORMATION")).toBe("BPF");
    expect(filialeParDefaut("VENTE_CARTES")).toBe("BPC");
    expect(filialeParDefaut("ACHAT_STOCK")).toBe("BPC");
    expect(filialeParDefaut("IMPOTS")).toBeNull();
    expect(filialeParDefaut("DIVERS")).toBeNull();
  });

  it("filiale imposée par certaines catégories", () => {
    expect(filialeImposee("FORMATION")).toBe("BPF");
    expect(filialeImposee("ENTRETIEN")).toBeNull();
    expect(() => verifierFilialeMouvement("LOCATION", "BPL")).not.toThrow();
    expect(() => verifierFilialeMouvement("LOCATION", "BPC")).toThrow("filiale Location");
    expect(() => verifierFilialeMouvement("VENTE_CARTES", null)).toThrow("filiale Cards");
    expect(() => verifierFilialeMouvement("DIVERS", "BPF")).not.toThrow();
    expect(() => verifierFilialeMouvement("IMPOTS", null)).not.toThrow();
  });

  it("nouvelles catégories : recettes Formation et Vente de cartes, dépense Achat de stock", () => {
    expect(categoriesDuSens("ENTREE")).toEqual(
      expect.arrayContaining(["FORMATION", "VENTE_CARTES"]),
    );
    expect(categoriesDuSens("SORTIE")).toContain("ACHAT_STOCK");
    expect(exigeJustificatif("SORTIE", "ACHAT_STOCK")).toBe(true);
    const m = [
      { numero: "1", sens: "ENTREE" as const, categorie: "FORMATION" as const, montant: 5000 },
      { numero: "2", sens: "ENTREE" as const, categorie: "VENTE_CARTES" as const, montant: 1200 },
      { numero: "3", sens: "SORTIE" as const, categorie: "ACHAT_STOCK" as const, montant: 700 },
    ];
    expect(synthese(m, 0)).toMatchObject({
      recettes: 6200,
      depenses: 700,
      resultatImposable: 5500,
    });
    expect(ventilation(m)).toMatchObject({ formation: 5000, ventesCartes: 1200, achatsStock: 700 });
    expect(colonneRegistre(m[2])).toEqual({ colonne: "depense", montant: 700 });
  });

  it("pièces abrégées des nouvelles numérotations", () => {
    expect(pieceAbregee("BPL-2026-0042")).toBe("BPL-0042");
    expect(pieceAbregee("BPC-2026-0001")).toBe("BPC-0001");
    expect(pieceAbregee("CTR-2026-0031")).toBe("CTR-0031");
  });
});

describe("ventilation par filiale (F-5)", () => {
  const m = (
    numero: string,
    sens: "ENTREE" | "SORTIE",
    categorie: CategorieMouvement,
    montant: number,
    filiale: CodeFiliale | null,
  ) => ({ numero, sens, categorie, montant, filiale });
  const mouvements = [
    m("1", "ENTREE", "LOCATION", 4000, "BPL"),
    m("2", "ENTREE", "PENALITE", 300, "BPL"),
    m("3", "SORTIE", "ENTRETIEN", 900, "BPL"),
    m("4", "ENTREE", "CAUTION_ENCAISSEE", 5000, "BPL"),
    m("5", "ENTREE", "FORMATION", 4000, "BPF"),
    m("6", "ENTREE", "VENTE_CARTES", 1200, "BPC"),
    m("7", "SORTIE", "ACHAT_STOCK", 700, "BPC"),
    m("8", "SORTIE", "VENTE_CARTES", 1200, "BPC"),
    m("9", "SORTIE", "IMPOTS", 1500, null),
    m("10", "ENTREE", "APPORT", 10000, null),
  ];

  it("recettes, dépenses et résultat par filiale, puis Groupe", () => {
    expect(syntheseParFiliale(mouvements)).toEqual([
      { filiale: "BPL", recettes: 4300, depenses: 900, resultat: 3400, nombreOperations: 4 },
      { filiale: "BPF", recettes: 4000, depenses: 0, resultat: 4000, nombreOperations: 1 },
      { filiale: "BPC", recettes: 0, depenses: 700, resultat: -700, nombreOperations: 3 },
      { filiale: null, recettes: 0, depenses: 1500, resultat: -1500, nombreOperations: 2 },
    ]);
  });

  it("la somme des lignes est la synthèse du groupe", () => {
    const lignes = syntheseParFiliale(mouvements);
    const groupe = synthese(mouvements, 0);
    const somme = (cle: "recettes" | "depenses" | "resultat" | "nombreOperations") =>
      lignes.reduce((t, l) => t + l[cle], 0);
    expect(somme("recettes")).toBe(groupe.recettes);
    expect(somme("depenses")).toBe(groupe.depenses);
    expect(somme("resultat")).toBe(groupe.resultatImposable);
    expect(somme("nombreOperations")).toBe(groupe.nombreOperations);
  });

  it("filtre du registre", () => {
    expect(lireFiltreFiliale("bpc")).toBe("BPC");
    expect(lireFiltreFiliale("Groupe")).toBe("groupe");
    expect(lireFiltreFiliale("XYZ")).toBeNull();
    expect(lireFiltreFiliale(["BPL"])).toBeNull();
    expect(filtrerParFiliale(mouvements, "BPF").map((x) => x.numero)).toEqual(["5"]);
    expect(filtrerParFiliale(mouvements, "groupe").map((x) => x.numero)).toEqual(["9", "10"]);
    expect(filtrerParFiliale(mouvements, null)).toHaveLength(10);
    expect(libelleFiltreFiliale("groupe")).toBe("Groupe");
    expect(libelleFiltreFiliale("BPC")).toBe("Cards");
    expect(SLUGS_FILIALE.BPF).toBe("formation");
  });
});
