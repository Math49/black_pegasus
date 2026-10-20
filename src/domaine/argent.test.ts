import { describe, expect, it } from "vitest";
import { estMontantValide, exigerMontant, formaterDollars } from "./argent";

const f = (s: string) => s.replace(/ /g, " ").replace(/-/g, "−");

describe("formaterDollars", () => {
  it.each([
    [0, "$0"],
    [300, "$300"],
    [1000, "$1 000"],
    [28000, "$28 000"],
    [514630, "$514 630"],
    [1234567, "$1 234 567"],
    [-12600, "-$12 600"],
    [-5, "-$5"],
  ])("%i → %s", (n, attendu) => {
    expect(formaterDollars(n)).toBe(f(attendu));
  });

  it("utilise une espace insécable fine, jamais une espace simple", () => {
    expect(formaterDollars(28000)).not.toContain(" ");
    expect(formaterDollars(28000)).toBe("$28 000");
  });

  it("affiche le signe + sur demande", () => {
    expect(formaterDollars(102250, { signe: true })).toBe(f("+$102 250"));
    expect(formaterDollars(-12600, { signe: true })).toBe(f("-$12 600"));
    expect(formaterDollars(0, { signe: true })).toBe("$0");
  });

  it("refuse les montants non entiers", () => {
    expect(() => formaterDollars(12.5)).toThrow();
  });
});

describe("validation des montants", () => {
  it("accepte les entiers positifs ou nuls", () => {
    expect(estMontantValide(0)).toBe(true);
    expect(estMontantValide(28000)).toBe(true);
    expect(exigerMontant(300)).toBe(300);
  });

  it.each([-1, 1.5, Number.NaN, Infinity, "300", null])("refuse %s", (v) => {
    expect(estMontantValide(v)).toBe(false);
    expect(() => exigerMontant(v, "Caution")).toThrow(/Caution invalide/);
  });
});
