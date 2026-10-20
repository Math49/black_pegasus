import { describe, expect, it } from "vitest";
import { formaterContenance, formaterPlaces, libelleType } from "./unites";

describe("unités d'affichage", () => {
  it("types", () => {
    expect(libelleType("BATEAU")).toBe("Bateau");
    expect(libelleType("HELICOPTERE")).toBe("Hélicoptère");
    expect(libelleType("HELICOPTERE", true)).toBe("Hélicoptères");
    expect(libelleType("AVION", true)).toBe("Avions");
  });

  it("places", () => {
    expect(formaterPlaces(1)).toBe("1 place");
    expect(formaterPlaces(10)).toBe("10 places");
    expect(formaterPlaces(1200)).toBe("1 200 places");
  });

  it("contenance", () => {
    expect(formaterContenance(20)).toBe("20 kg");
    expect(formaterContenance(300)).toBe("300 kg");
    expect(formaterContenance(1000)).toBe("1 t");
    expect(formaterContenance(1500)).toBe("1,5 t");
    expect(formaterContenance(2000)).toBe("2 t");
    expect(formaterContenance(12345)).toBe("12,3 t");
  });
});
