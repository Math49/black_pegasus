import { describe, expect, it } from "vitest";
import { totalDegats } from "./degats";

const RAYURES = { libelle: "Rayures ou éraflures légères", montant: 500 };
const RESERVOIR = { libelle: "Réservoir non refait", montant: 250 };
const IMPORTANT = { libelle: "Dégât important (coque, moteur)", montant: 1000 };

describe("totalDegats", () => {
  it("aucun forfait → 0", () => {
    expect(totalDegats([])).toBe(0);
  });

  it("un forfait", () => {
    expect(totalDegats([RAYURES])).toBe(500);
  });

  it("plusieurs forfaits", () => {
    expect(totalDegats([RAYURES, RESERVOIR, IMPORTANT])).toBe(1750);
  });

  it("refuse un montant invalide", () => {
    expect(() => totalDegats([{ libelle: "Rayures", montant: -500 }])).toThrow(/Rayures/);
  });
});
