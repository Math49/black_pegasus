import { describe, expect, it } from "vitest";
import { depuisHeureServeur } from "./dates";
import { calculerRetard, estEnRetard, minutesDepassement } from "./retard";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);
const REGLES = { toleranceMin: 15, majoration: 0.5, seuilDefautRestitutionMin: 180, fuseau: PARIS };

const retard = (retour: string, prixHeure: number, fin = "2026-10-24T21:00") =>
  calculerRetard({ finPrevue: h(fin), retourReel: h(retour), prixHeure, ...REGLES });

describe("calculerRetard", () => {
  it.each([
    ["5 min", "2026-10-24T21:05", 5, 0],
    ["15 min (tolérance)", "2026-10-24T21:15", 15, 0],
    ["16 min → 1 h", "2026-10-24T21:16", 16, 1],
    ["75 min → 1 h", "2026-10-24T22:15", 75, 1],
    ["76 min → 2 h", "2026-10-24T22:16", 76, 2],
  ])("%s", (_, retour, minutes, heures) => {
    const r = retard(retour, 150);
    expect(r.minutes).toBe(minutes);
    expect(r.heuresFacturees).toBe(heures);
    expect(r.penalite).toBe(heures * 225);
    expect(r.defautRestitution).toBe(false);
  });

  it("Seashark2 rendu 40 min après l'heure → $225", () => {
    expect(retard("2026-10-24T21:40", 150)).toEqual({
      minutes: 40,
      heuresFacturees: 1,
      penalite: 225,
      defautRestitution: false,
    });
  });

  it("Toro2 rendu 70 min après l'heure → $900 (CTR-2026-0032)", () => {
    expect(retard("2026-10-19T23:10", 600, "2026-10-19T22:00")).toMatchObject({
      minutes: 70,
      heuresFacturees: 1,
      penalite: 900,
    });
  });

  it("retour anticipé → 0", () => {
    expect(retard("2026-10-24T20:00", 600)).toEqual({
      minutes: 0,
      heuresFacturees: 0,
      penalite: 0,
      defautRestitution: false,
    });
  });

  it("180 min → pas encore défaut ; > 180 min → défaut de restitution", () => {
    expect(retard("2026-10-25T00:00", 150).defautRestitution).toBe(false);
    const r = retard("2026-10-25T00:01", 150);
    expect(r.defautRestitution).toBe(true);
    expect(r.heuresFacturees).toBe(3);
  });

  it("retard à cheval sur le changement d'heure compté à l'heure affichée", () => {
    const r = retard("2026-10-25T03:30", 600, "2026-10-25T01:30");
    expect(r.minutes).toBe(120);
  });

  it("paramètres pris en compte et arrondi au dollar", () => {
    const r = calculerRetard({
      finPrevue: h("2026-10-24T21:00"),
      retourReel: h("2026-10-24T21:40"),
      prixHeure: 155,
      toleranceMin: 30,
      majoration: 0.25,
      seuilDefautRestitutionMin: 30,
      fuseau: PARIS,
    });
    expect(r).toEqual({ minutes: 40, heuresFacturees: 1, penalite: 194, defautRestitution: true });
  });

  it("refuse des paramètres invalides", () => {
    const base = { finPrevue: h("2026-10-24T21:00"), retourReel: h("2026-10-24T21:40") };
    expect(() =>
      calculerRetard({ ...base, prixHeure: 150, ...REGLES, toleranceMin: -1 }),
    ).toThrow();
    expect(() =>
      calculerRetard({ ...base, prixHeure: 150, ...REGLES, majoration: -0.5 }),
    ).toThrow();
    expect(() => calculerRetard({ ...base, prixHeure: -1, ...REGLES })).toThrow();
  });
});

describe("contrat en cours", () => {
  const fin = h("2026-10-24T21:00");

  it("CTR-2026-0039 à 21:40 : en retard de 40 min", () => {
    expect(estEnRetard(fin, h("2026-10-24T21:40"))).toBe(true);
    expect(minutesDepassement(fin, h("2026-10-24T21:40"), PARIS)).toBe(40);
  });

  it("pas en retard avant ou à l'heure prévue", () => {
    expect(estEnRetard(fin, h("2026-10-24T21:00"))).toBe(false);
    expect(minutesDepassement(fin, h("2026-10-24T20:00"), PARIS)).toBe(0);
  });
});
