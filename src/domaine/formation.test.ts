import { describe, expect, it } from "vitest";
import { regrouperPermis, schemaDemandeFormation } from "./formation";

const valide = {
  nomRp: "Lena Castillo",
  telephone: "555-0101",
  permisId: null,
  message: "Je souhaite découvrir les formations aériennes.",
};
describe("demandes de formation", () => {
  it("normalise les espaces extérieurs et accepte les bornes", () => {
    expect(
      schemaDemandeFormation.parse({
        ...valide,
        nomRp: "  Lena Castillo  ",
        telephone: "  555-0123  ",
      }).nomRp,
    ).toBe(valide.nomRp);
    for (const nomRp of ["AB", "a".repeat(60)])
      for (const message of ["x".repeat(10), "x".repeat(1000)])
        for (const telephone of ["555-0123", "000-0000"])
          expect(
            schemaDemandeFormation.safeParse({
              ...valide,
              nomRp,
              message,
              telephone,
              permisId: "permis-1",
            }).success,
          ).toBe(true);
  });
  it.each([
    { nomRp: "A" },
    { nomRp: "a".repeat(61) },
    { nomRp: "  " },
    { message: "court" },
    { message: "x".repeat(1001) },
    { message: "   " },
    ...["123", "5550123", "555 0123", "555-012", "555-01234", "+33-1234", "abc-defg"].map(
      (telephone) => ({
        telephone,
      }),
    ),
    { permisId: 1 },
    { permisId: "p".repeat(101) },
  ])("refuse une saisie invalide : %j", (saisie) => {
    expect(schemaDemandeFormation.safeParse({ ...valide, ...saisie }).success).toBe(false);
  });
});
describe("catalogue de permis", () => {
  it("regroupe par identifiant et trie domaines et permis, sans mutation", () => {
    const aerien = { id: "a", nom: "Aérien", ordre: 1 };
    const navigation = { id: "n", nom: "Navigation", ordre: 1 };
    const premier = { id: "p", nom: "Prioritaire", ordre: 0 };
    const permis = [
      { nom: "Voilier", ordre: 2, domaine: navigation },
      { nom: "Hélicoptère", ordre: 1, domaine: aerien },
      { nom: "Bateau", ordre: 1, domaine: navigation },
      { nom: "Avion", ordre: 1, domaine: aerien },
      { nom: "Départ", ordre: 9, domaine: premier },
    ];
    const avant = structuredClone(permis);
    expect(regrouperPermis(permis).map((g) => [g.domaine.nom, g.permis.map((p) => p.nom)])).toEqual(
      [
        ["Prioritaire", ["Départ"]],
        ["Aérien", ["Avion", "Hélicoptère"]],
        ["Navigation", ["Bateau", "Voilier"]],
      ],
    );
    expect(permis).toEqual(avant);
    expect(regrouperPermis([])).toEqual([]);
  });
});
