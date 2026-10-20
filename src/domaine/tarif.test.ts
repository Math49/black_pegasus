import { describe, expect, it } from "vitest";
import { depuisHeureServeur } from "./dates";
import { calculerTarif, seuilJournalierHeures, tarifPourHeures } from "./tarif";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);
const TORO2 = { prixHeure: 600, prixJour: 3600 };
const LUXOR = { prixHeure: 4500, prixJour: 28000 };

const tarif = (debut: string, fin: string, prix: { prixHeure: number; prixJour: number }) =>
  calculerTarif({ debut: h(debut), fin: h(fin), ...prix, fuseau: PARIS });

describe("calculerTarif", () => {
  it("Toro2 12 h → $3 600 au journalier, économie $3 600", () => {
    expect(tarif("2026-10-24T08:00", "2026-10-24T20:00", TORO2)).toEqual({
      heures: 12,
      horaire: 7200,
      journalier: 3600,
      montant: 3600,
      tarifApplique: "JOURNALIER",
      economie: 3600,
    });
  });

  it("Toro2 22:00 → 10:00 la nuit du changement d'heure : 12 h (maquette 17)", () => {
    const r = tarif("2026-10-24T22:00", "2026-10-25T10:00", TORO2);
    expect(r.heures).toBe(12);
    expect(r.montant).toBe(3600);
  });

  it("1 min → 1 h facturée", () => {
    const r = tarif("2026-10-24T08:00", "2026-10-24T08:01", TORO2);
    expect(r).toMatchObject({ heures: 1, montant: 600, tarifApplique: "HORAIRE", economie: 0 });
  });

  it("toute heure entamée est due", () => {
    expect(tarif("2026-10-24T08:00", "2026-10-24T10:01", TORO2).heures).toBe(3);
    expect(tarif("2026-10-24T08:00", "2026-10-24T10:00", TORO2).heures).toBe(2);
  });

  it("24 h Luxor → $28 000", () => {
    expect(tarif("2026-10-24T08:00", "2026-10-25T08:00", LUXOR)).toEqual({
      heures: 24,
      horaire: 108000,
      journalier: 28000,
      montant: 28000,
      tarifApplique: "JOURNALIER",
      economie: 80000,
    });
  });

  it("25 h Luxor → 1 jour + 1 h", () => {
    const r = tarif("2026-10-20T08:00", "2026-10-21T09:00", LUXOR);
    expect(r).toMatchObject({ heures: 25, journalier: 32500, montant: 32500 });
  });

  it("30 h Luxor → 1 jour + 6 h plafonnées à un jour", () => {
    const r = tarif("2026-10-20T08:00", "2026-10-21T14:00", LUXOR);
    expect(r).toMatchObject({ heures: 30, journalier: 55000, montant: 55000 });
    expect(tarifPourHeures(30, 600, 3600).journalier).toBe(3600 + 3600);
  });

  it("égalité horaire / journalier → horaire, sans économie", () => {
    expect(tarifPourHeures(6, 600, 3600)).toMatchObject({
      horaire: 3600,
      journalier: 3600,
      tarifApplique: "HORAIRE",
      economie: 0,
    });
  });

  it("fin ≤ début → erreur", () => {
    expect(() => tarif("2026-10-24T08:00", "2026-10-24T08:00", TORO2)).toThrow(/postérieure/);
    expect(() => tarif("2026-10-24T08:00", "2026-10-24T07:00", TORO2)).toThrow(/postérieure/);
  });

  it("refuse des prix invalides", () => {
    expect(() => tarifPourHeures(2, -1, 3600)).toThrow();
    expect(() => tarifPourHeures(2, 600, 1.5)).toThrow();
    expect(() => tarifPourHeures(0, 600, 3600)).toThrow(/Durée/);
  });
});

describe("seuilJournalierHeures", () => {
  it("Toro2 : avantageux dès 7 h", () => {
    expect(seuilJournalierHeures(600, 3600)).toBe(7);
    expect(tarifPourHeures(7, 600, 3600).tarifApplique).toBe("JOURNALIER");
    expect(tarifPourHeures(6, 600, 3600).tarifApplique).toBe("HORAIRE");
  });

  it("Luxor : dès 7 h (28 000 / 4 500 = 6,2)", () => {
    expect(seuilJournalierHeures(4500, 28000)).toBe(7);
  });

  it("jamais avant 24 h", () => {
    expect(seuilJournalierHeures(100, 2400)).toBeNull();
    expect(seuilJournalierHeures(0, 2400)).toBeNull();
  });
});
