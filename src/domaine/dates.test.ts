import { describe, expect, it } from "vitest";
import {
  depuisHeureServeur,
  formaterDateCourte,
  dureeMinutes,
  formaterHeureServeurIso,
  versHeureServeur,
} from "./dates";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);

describe("conversion heure serveur ↔ UTC", () => {
  it("heure d'été (UTC+2)", () => {
    expect(h("2026-10-24T22:00").toISOString()).toBe("2026-10-24T20:00:00.000Z");
  });

  it("heure d'hiver (UTC+1)", () => {
    expect(h("2026-10-25T10:00").toISOString()).toBe("2026-10-25T09:00:00.000Z");
  });

  it("accepte les secondes", () => {
    expect(h("2026-10-24T21:40:30").toISOString()).toBe("2026-10-24T19:40:30.000Z");
  });

  it("aller-retour", () => {
    const instant = new Date("2026-10-24T19:40:00Z");
    expect(formaterHeureServeurIso(instant, PARIS)).toBe("2026-10-24T21:40");
    expect(versHeureServeur(instant, PARIS).getHours()).toBe(21);
    expect(formaterHeureServeurIso(h("2026-01-05T08:07"), PARIS)).toBe("2026-01-05T08:07");
  });

  it("autre fuseau", () => {
    expect(depuisHeureServeur("2026-07-01T12:00", "America/Los_Angeles").toISOString()).toBe(
      "2026-07-01T19:00:00.000Z",
    );
  });

  it.each([
    "",
    "24/10/2026 22:00",
    "2026-10-24",
    "2026-13-01T10:00",
    "2026-02-29T10:00",
    "2026-10-00T10:00",
    "2026-10-24T24:00",
    "2026-10-24T22:60",
    "2026-10-24T22:00:60",
  ])("refuse « %s »", (t) => {
    expect(() => h(t)).toThrow(/Date invalide/);
  });
});

describe("dureeMinutes", () => {
  it("location 22:00 → 10:00 la nuit du passage à l'heure d'hiver = 12 h", () => {
    const debut = h("2026-10-24T22:00");
    const fin = h("2026-10-25T10:00");
    expect(fin.getTime() - debut.getTime()).toBe(13 * 3_600_000); // temps réel écoulé
    expect(dureeMinutes(debut, fin, PARIS)).toBe(12 * 60); // heure affichée
  });

  it("22:00 → 10:00 la nuit du passage à l'heure d'été = 12 h", () => {
    expect(dureeMinutes(h("2026-03-28T22:00"), h("2026-03-29T10:00"), PARIS)).toBe(720);
  });

  it("durée ordinaire", () => {
    expect(dureeMinutes(h("2026-10-24T21:00"), h("2026-10-24T21:40"), PARIS)).toBe(40);
  });

  it("tronque les secondes", () => {
    expect(dureeMinutes(h("2026-10-24T21:00"), h("2026-10-24T21:00:59"), PARIS)).toBe(0);
    expect(dureeMinutes(h("2026-10-24T21:00:59"), h("2026-10-24T21:00"), PARIS)).toBe(0);
  });

  it("négative si la fin précède le début", () => {
    expect(dureeMinutes(h("2026-10-24T22:00"), h("2026-10-24T21:00"), PARIS)).toBe(-60);
  });
});

describe("formaterDateCourte", () => {
  it("jour/mois/année", () => {
    expect(formaterDateCourte("2026-10-20")).toBe("20/10/2026");
    expect(formaterDateCourte("2026-01-05T10:00:00Z")).toBe("05/01/2026");
    expect(() => formaterDateCourte("20/10/2026")).toThrow(/Date invalide/);
  });
});
