import { describe, expect, it } from "vitest";
import { depuisHeureServeur } from "./dates";
import {
  contientInstant,
  idSemaine,
  lireIdSemaine,
  ouvertureCloture,
  semaineDe,
  semaineImputation,
  semaineParId,
  semaineParNumero,
  semainePrecedente,
  semaineSuivante,
} from "./semaine";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);

describe("semaineDe", () => {
  it("S43 2026 : lundi 19/10 00:00 → lundi 26/10 00:00 (heure serveur)", () => {
    expect(semaineDe(h("2026-10-24T21:40"), PARIS)).toEqual({
      id: "2026-S43",
      annee: 2026,
      numero: 43,
      debut: new Date("2026-10-18T22:00:00Z"), // heure d'été
      fin: new Date("2026-10-25T23:00:00Z"), // heure d'hiver
    });
  });

  it("dimanche 23:59 → S43 ; lundi 00:00 → S44", () => {
    expect(semaineDe(h("2026-10-25T23:59"), PARIS).id).toBe("2026-S43");
    expect(semaineDe(h("2026-10-26T00:00"), PARIS).id).toBe("2026-S44");
    expect(semaineDe(h("2026-10-19T00:00"), PARIS).id).toBe("2026-S43");
    expect(semaineDe(h("2026-10-18T23:59"), PARIS).id).toBe("2026-S42");
  });

  it("dépend du fuseau du serveur", () => {
    const instant = new Date("2026-10-25T23:30:00Z"); // lundi 00:30 à Paris
    expect(semaineDe(instant, PARIS).id).toBe("2026-S44");
    expect(semaineDe(instant, "America/New_York").id).toBe("2026-S43");
  });

  it("semaine 53 (2026 commence un jeudi)", () => {
    const s = semaineDe(h("2026-12-31T12:00"), PARIS);
    expect(s).toMatchObject({ id: "2026-S53", annee: 2026, numero: 53 });
    expect(s.debut).toEqual(h("2026-12-28T00:00"));
    expect(s.fin).toEqual(h("2027-01-04T00:00"));
  });

  it("changement d'année ISO", () => {
    expect(semaineDe(h("2027-01-01T10:00"), PARIS).id).toBe("2026-S53");
    expect(semaineDe(h("2027-01-03T23:59"), PARIS).id).toBe("2026-S53");
    expect(semaineDe(h("2027-01-04T00:00"), PARIS).id).toBe("2027-S01");
    expect(semaineDe(h("2024-12-30T08:00"), PARIS).id).toBe("2025-S01");
  });
});

describe("navigation entre semaines", () => {
  it("semaineSuivante / semainePrecedente", () => {
    const s43 = semaineParNumero(2026, 43, PARIS);
    expect(semaineSuivante(s43, PARIS).id).toBe("2026-S44");
    expect(semainePrecedente(s43, PARIS).id).toBe("2026-S42");
    expect(semaineSuivante(semaineParNumero(2026, 53, PARIS), PARIS).id).toBe("2027-S01");
    expect(semainePrecedente(semaineParNumero(2027, 1, PARIS), PARIS).id).toBe("2026-S53");
  });

  it("semaineParNumero et semaineParId", () => {
    expect(semaineParNumero(2026, 43, PARIS)).toEqual(semaineDe(h("2026-10-21T12:00"), PARIS));
    expect(semaineParId("2026-S42", PARIS).debut).toEqual(h("2026-10-12T00:00"));
    expect(semaineParNumero(2026, 1, PARIS).debut).toEqual(h("2025-12-29T00:00"));
  });

  it("refuse une semaine inexistante", () => {
    expect(() => semaineParNumero(2027, 53, PARIS)).toThrow(/pas de semaine 53/);
    expect(() => semaineParNumero(2026, 0, PARIS)).toThrow();
    expect(() => lireIdSemaine("S43")).toThrow(/Semaine invalide/);
  });

  it("identifiants", () => {
    expect(idSemaine(2026, 43)).toBe("2026-S43");
    expect(idSemaine(2027, 1)).toBe("2027-S01");
    expect(lireIdSemaine("2027-S01")).toEqual({ annee: 2027, numero: 1 });
  });

  it("contientInstant (borne de fin exclue)", () => {
    const s43 = semaineParNumero(2026, 43, PARIS);
    expect(contientInstant(s43, h("2026-10-19T00:00"))).toBe(true);
    expect(contientInstant(s43, h("2026-10-25T23:59"))).toBe(true);
    expect(contientInstant(s43, h("2026-10-26T00:00"))).toBe(false);
  });
});

describe("ouvertureCloture", () => {
  const s43 = semaineParNumero(2026, 43, PARIS);

  it("dès le dimanche 00:00 par défaut (24 h avant la fin), malgré le changement d'heure", () => {
    expect(ouvertureCloture(s43, 24, PARIS)).toEqual(h("2026-10-25T00:00"));
  });

  it("autres délais", () => {
    expect(ouvertureCloture(s43, 0, PARIS)).toEqual(h("2026-10-26T00:00"));
    expect(ouvertureCloture(s43, 6, PARIS)).toEqual(h("2026-10-25T18:00"));
    expect(ouvertureCloture(s43, 30, PARIS)).toEqual(h("2026-10-24T18:00"));
  });

  it("refuse un délai invalide", () => {
    expect(() => ouvertureCloture(s43, -1, PARIS)).toThrow();
    expect(() => ouvertureCloture(s43, 200, PARIS)).toThrow();
  });
});

describe("semaineImputation", () => {
  const aucune = () => false;

  it("semaine ouverte : imputé à la semaine de sa date", () => {
    const r = semaineImputation(h("2026-10-25T23:59"), PARIS, aucune);
    expect(r.semaine.id).toBe("2026-S43");
    expect(r.reporteDe).toBeNull();
  });

  it("semaine clôturée : reporté sur la première semaine ouverte suivante", () => {
    const cloturees = new Set(["2026-S43", "2026-S44"]);
    const r = semaineImputation(h("2026-10-25T23:59"), PARIS, (id) => cloturees.has(id));
    expect(r.semaine.id).toBe("2026-S45");
    expect(r.reporteDe?.id).toBe("2026-S43");
  });

  it("garde-fou si tout est clôturé", () => {
    expect(() => semaineImputation(h("2026-10-25T23:59"), PARIS, () => true)).toThrow();
  });
});
