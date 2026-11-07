import { describe, expect, it } from "vitest";
import {
  filialeImposee,
  filialeParDefaut,
  libelleFiliale,
  verifierFilialeMouvement,
} from "./filiales";
import { exigeJustificatif, categoriesDuSens } from "./solde";
import { colonneRegistre, pieceAbregee, synthese, ventilation } from "./comptabilite";

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
