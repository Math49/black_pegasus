import { describe, expect, it } from "vitest";
import { adresseClient, creerLimiteur } from "./limiteur";

describe("limitation de débit", () => {
  it("autorise jusqu'à la limite puis refuse jusqu'à la fin de la fenêtre", () => {
    const l = creerLimiteur({ limite: 2, fenetreMs: 60_000 });
    expect(l.essayer("a", 0).autorise).toBe(true);
    expect(l.essayer("a", 1000).autorise).toBe(true);
    expect(l.essayer("a", 2000)).toEqual({ autorise: false, reessayerDansS: 58 });
    expect(l.essayer("b", 2000).autorise).toBe(true);
    expect(l.essayer("a", 60_000).autorise).toBe(true);
  });

  it("borne la mémoire en purgeant les fenêtres expirées", () => {
    const l = creerLimiteur({ limite: 1, fenetreMs: 10 });
    for (let i = 0; i < 5002; i++) l.essayer(`c${i}`, 0);
    expect(l.essayer("c1", 100).autorise).toBe(true);
  });

  it("adresse du client", () => {
    expect(adresseClient(new Headers({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
    expect(adresseClient(new Headers({ "x-real-ip": "5.6.7.8" }))).toBe("5.6.7.8");
    expect(adresseClient(new Headers())).toBe("inconnue");
  });
});
