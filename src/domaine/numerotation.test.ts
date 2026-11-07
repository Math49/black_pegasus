import { describe, expect, it } from "vitest";
import {
  cleCompteurContrats,
  libelleSemaine,
  lireNumeroOperation,
  numeroContrat,
  numeroDeclaration,
  numeroJustificatif,
  numeroOperation,
  numeroOperationAffiche,
  numeroOperationEnBase,
} from "./numerotation";

describe("numérotation", () => {
  it("contrats", () => {
    expect(numeroContrat(2026, 42)).toBe("BPL-2026-0042");
    expect(numeroContrat(2026, 1)).toBe("BPL-2026-0001");
    expect(numeroContrat(2026, 12345)).toBe("BPL-2026-12345");
    expect(cleCompteurContrats(2026)).toBe("BPL-2026");
  });

  it("opérations", () => {
    expect(numeroOperation(43, 7)).toBe("OP-43-007");
    expect(numeroOperation(1, 12)).toBe("OP-01-012");
    expect(numeroOperationEnBase(2026, 43, 12)).toBe("2026-OP-43-012");
    expect(numeroOperationAffiche("2026-OP-43-012")).toBe("OP-43-012");
    expect(numeroOperationAffiche("OP-43-012")).toBe("OP-43-012");
  });

  it("justificatifs, déclarations, semaines", () => {
    expect(numeroJustificatif(43, 3)).toBe("JUST-43-03");
    expect(numeroDeclaration(2026, 43)).toBe("DEC-2026-S43");
    expect(numeroDeclaration(2027, 1)).toBe("DEC-2027-S01");
    expect(libelleSemaine(43)).toBe("S43");
  });

  it("lecture d'un numéro d'opération", () => {
    expect(lireNumeroOperation("OP-43-007")).toEqual({ semaine: 43, n: 7 });
    expect(lireNumeroOperation("2026-OP-43-1012")).toEqual({ semaine: 43, n: 1012 });
    expect(lireNumeroOperation("CTR-2026-0042")).toBeNull();
  });

  it.each([0, -1, 1.5])("refuse la séquence %s", (n) => {
    expect(() => numeroContrat(2026, n)).toThrow();
  });
});
