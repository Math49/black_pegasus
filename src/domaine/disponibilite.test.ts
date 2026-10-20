import { describe, expect, it } from "vitest";
import { disponibilite, exemplaireLouable } from "./disponibilite";
import type { StatutExemplaire } from "./types";

const ex = (...statuts: StatutExemplaire[]) => statuts.map((statut) => ({ statut }));

describe("disponibilite", () => {
  it("Seashark2 : 2 / 4 disponibles", () => {
    expect(disponibilite(ex("LOUE", "DISPONIBLE", "LOUE", "DISPONIBLE"))).toEqual({
      libres: 2,
      total: 4,
      libelle: "2 / 4 disponibles",
    });
  });

  it("singulier", () => {
    expect(disponibilite(ex("DISPONIBLE")).libelle).toBe("1 / 1 disponible");
    expect(disponibilite(ex("DISPONIBLE", "MAINTENANCE")).libelle).toBe("1 / 2 disponible");
  });

  it("Complet si aucun exemplaire libre (loué ou en maintenance)", () => {
    expect(disponibilite(ex("LOUE")).libelle).toBe("Complet");
    expect(disponibilite(ex("MAINTENANCE", "LOUE"))).toEqual({
      libres: 0,
      total: 2,
      libelle: "Complet",
    });
    expect(disponibilite([]).libelle).toBe("Complet");
  });

  it("seuls les exemplaires disponibles sont louables", () => {
    expect(exemplaireLouable("DISPONIBLE")).toBe(true);
    expect(exemplaireLouable("LOUE")).toBe(false);
    expect(exemplaireLouable("MAINTENANCE")).toBe(false);
  });
});
