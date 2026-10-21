import { describe, expect, it } from "vitest";
import {
  deplacer,
  estFuseauValide,
  forfaitsCites,
  majorationDepuisPourcent,
  majorationEnPourcent,
  verifierForfaits,
  verifierSuppressionCategorie,
} from "./parametres";

describe("paramètres du site", () => {
  it("fuseau horaire", () => {
    expect(estFuseauValide("Europe/Paris")).toBe(true);
    expect(estFuseauValide("America/Los_Angeles")).toBe(true);
    expect(estFuseauValide("UTC")).toBe(true);
    expect(estFuseauValide("Europe/Atlantide")).toBe(false);
    expect(estFuseauValide("paris")).toBe(false);
  });

  it("réordonner une liste", () => {
    expect(deplacer(["a", "b", "c"], 0, 1)).toEqual(["b", "a", "c"]);
    expect(deplacer(["a", "b", "c"], 2, -1)).toEqual(["a", "c", "b"]);
    expect(deplacer(["a", "b", "c"], 0, -1)).toEqual(["a", "b", "c"]);
    expect(deplacer(["a", "b", "c"], 5, 1)).toEqual(["a", "b", "c"]);
  });

  it("forfaits cités et contrôle des forfaits", () => {
    const cites = forfaitsCites([
      "Rayures : {{forfait:Rayures ou éraflures légères}}, réservoir {{ forfait: Réservoir non refait }}.",
      "Rien ici {{telephone}}",
    ]);
    expect(cites).toEqual(["Rayures ou éraflures légères", "Réservoir non refait"]);
    const forfaits = [
      { libelle: "Rayures ou éraflures légères", montant: 500 },
      { libelle: "Réservoir non refait", montant: 250 },
    ];
    expect(() => verifierForfaits(forfaits, cites)).not.toThrow();
    expect(() => verifierForfaits(forfaits.slice(1), cites)).toThrow("cité dans le règlement");
    expect(() => verifierForfaits([...forfaits, forfaits[0]], [])).toThrow("en double");
    expect(() => verifierForfaits([{ libelle: "ab", montant: 1 }], [])).toThrow("3 caractères");
    expect(() => verifierForfaits([{ libelle: "Coque", montant: -1 }], [])).toThrow("montant");
  });

  it("catégorie utilisée non supprimable", () => {
    expect(() => verifierSuppressionCategorie("Jet-ski", 0)).not.toThrow();
    expect(() => verifierSuppressionCategorie("Jet-ski", 2)).toThrow("2 véhicules");
    expect(() => verifierSuppressionCategorie("Jet-ski", 1)).toThrow("1 véhicule :");
  });

  it("majoration en pourcentage", () => {
    expect(majorationDepuisPourcent(50)).toBe(0.5);
    expect(majorationEnPourcent(0.5)).toBe(50);
    expect(majorationEnPourcent(0.333)).toBe(33);
  });
});
