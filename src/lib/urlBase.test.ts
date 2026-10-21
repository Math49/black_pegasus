import { describe, expect, it } from "vitest";
import { urlBase } from "./urlBase";

describe("adresse de la base", () => {
  it("DATABASE_URL prioritaire", () => {
    expect(urlBase({ DATABASE_URL: "postgresql://a:b@h:1/d", POSTGRES_USER: "x" })).toBe(
      "postgresql://a:b@h:1/d",
    );
  });

  it("assemblée depuis POSTGRES_*, mot de passe encodé", () => {
    const url = urlBase({
      POSTGRES_USER: "black_pegasus",
      POSTGRES_PASSWORD: "p@ss:w/rd#?%",
      POSTGRES_DB: "black_pegasus",
      POSTGRES_HOST: "postgres",
    });
    expect(url).toBe(
      "postgresql://black_pegasus:p%40ss%3Aw%2Frd%23%3F%25@postgres:5432/black_pegasus?schema=public",
    );
    const u = new URL(url);
    expect([u.hostname, u.port, decodeURIComponent(u.password)]).toEqual([
      "postgres",
      "5432",
      "p@ss:w/rd#?%",
    ]);
  });

  it("erreur explicite si rien n'est renseigné", () => {
    expect(() => urlBase({ POSTGRES_USER: "u" })).toThrow("POSTGRES_PASSWORD, POSTGRES_DB");
  });
});
