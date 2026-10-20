import { describe, expect, it } from "vitest";
import {
  compteursFlotte,
  normaliserImmatriculation,
  slugifier,
  slugUnique,
  verifierExemplaires,
} from "./vehicules";

describe("véhicules", () => {
  it("slugs", () => {
    expect(slugifier("SuperVolito Carbon")).toBe("supervolito-carbon");
    expect(slugifier("Streamer216")).toBe("streamer216");
    expect(slugifier("  Hélico   d'été ! ")).toBe("helico-d-ete");
    expect(slugifier("***")).toBe("vehicule");
    expect(slugUnique("toro2", new Set(["toro2", "toro2-2"]))).toBe("toro2-3");
    expect(slugUnique("dodo", new Set(["toro2"]))).toBe("dodo");
  });

  it("immatriculations", () => {
    expect(normaliserImmatriculation(" bp sh  01 ")).toBe("BP SH 01");
    expect(verifierExemplaires(["BP SH 01", "bp sh 02"])).toBeNull();
    expect(verifierExemplaires(["BP SH 01", "bp  sh 01"])).toBe(
      "L’immatriculation BP SH 01 est saisie deux fois.",
    );
    expect(verifierExemplaires(["BP SH 01", "  "])).toMatch(/immatriculation/);
    expect(verifierExemplaires(["X".repeat(21)])).toMatch(/trop longue/);
  });

  it("compteurs (maquette 14 : 9 / 12 / 6 / 5 / 1)", () => {
    const ex = (...s: ("DISPONIBLE" | "LOUE" | "MAINTENANCE")[]) => ({
      exemplaires: s.map((statut) => ({ statut })),
    });
    expect(
      compteursFlotte([
        ex("LOUE", "DISPONIBLE", "LOUE", "DISPONIBLE"),
        ex("DISPONIBLE"),
        ex("DISPONIBLE"),
        ex("MAINTENANCE"),
        ex("DISPONIBLE"),
        ex("LOUE"),
        ex("LOUE"),
        ex("DISPONIBLE"),
        ex("LOUE"),
      ]),
    ).toEqual({ modeles: 9, exemplaires: 12, disponibles: 6, loues: 5, maintenance: 1 });
  });
});
