import { describe, expect, it } from "vitest";
import {
  estIdentifiantDiscord,
  formaterDerniereConnexion,
  nomCompte,
  normaliserNomRp,
} from "./comptes";
import { depuisHeureServeur } from "./dates";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);
const maintenant = h("2026-10-24T21:40");
const f = (t: string | null, moi = false) =>
  formaterDerniereConnexion(t ? h(t) : null, maintenant, PARIS, moi);

describe("dernière connexion (maquette 21)", () => {
  it("valeurs de la maquette", () => {
    expect(f("2026-10-24T21:40", true)).toBe("En ligne");
    expect(f("2026-10-24T19:40")).toBe("Il y a 2 h");
    expect(f("2026-10-24T21:00")).toBe("Il y a 40 min");
    expect(f("2026-10-23T23:10")).toBe("Hier, 23:10");
    expect(f("2026-09-12T20:00")).toBe("12/09/2026");
  });

  it("cas limites", () => {
    expect(f("2026-10-24T21:39:30")).toBe("À l’instant");
    expect(f(null)).toBe("Jamais connecté");
    expect(f("2026-10-24T00:10")).toBe("Il y a 21 h");
    expect(f("2026-10-23T00:00")).toBe("Hier, 00:00");
    expect(f("2026-10-22T23:59")).toBe("22/10/2026");
  });
});

describe("identifiants et noms", () => {
  it("identifiant Discord", () => {
    expect(estIdentifiantDiscord("381336199614300160")).toBe(true);
    expect(estIdentifiantDiscord(" 734205918846263296 ")).toBe(true);
    expect(estIdentifiantDiscord("1234")).toBe(false);
    expect(estIdentifiantDiscord("38133619961430016a")).toBe(false);
  });

  it("nom affiché de repli", () => {
    expect(nomCompte({ nomAffiche: "Lena Castillo", pseudo: "lena.cstl", discordId: "1" })).toBe(
      "Lena Castillo",
    );
    expect(nomCompte({ nomAffiche: "", pseudo: "rafa.ortiz", discordId: "1" })).toBe("rafa.ortiz");
    expect(nomCompte({ nomAffiche: "", pseudo: "", discordId: "734205918846263296" })).toBe(
      "Compte 734205918846263296",
    );
  });
});

describe("nom RP", () => {
  it("prioritaire sur le nom Discord", () => {
    const c = { nomAffiche: "vince", pseudo: "vmoretti", discordId: "1" };
    expect(nomCompte({ ...c, nomRp: "Vincent Moretti" })).toBe("Vincent Moretti");
    expect(nomCompte({ ...c, nomRp: "  " })).toBe("vince");
    expect(nomCompte({ ...c, nomRp: null })).toBe("vince");
  });

  it("saisie normalisée", () => {
    expect(normaliserNomRp("  Vincent   Moretti ")).toBe("Vincent Moretti");
    expect(normaliserNomRp("")).toBe("");
    expect(() => normaliserNomRp("V")).toThrow("2 à 60");
    expect(() => normaliserNomRp("x".repeat(61))).toThrow("2 à 60");
  });
});
