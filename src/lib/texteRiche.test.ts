import { describe, expect, it } from "vitest";
import { reglement } from "../../prisma/contenus";
import { lireBlocs, lireEnLigne } from "./texteRiche";

describe("lireBlocs", () => {
  it("clauses, encadré, titre, paragraphe", () => {
    expect(
      lireBlocs(
        "**2.1** Les tarifs.\n\n> Le tarif journalier\n> s’applique.\n\n## Un salon\n\nTexte\nsur deux lignes.",
      ),
    ).toEqual([
      { type: "clause", numero: "2.1", texte: "Les tarifs." },
      { type: "encadre", texte: "Le tarif journalier\ns’applique." },
      { type: "titre", texte: "Un salon" },
      { type: "paragraphe", texte: "Texte sur deux lignes." },
    ]);
  });

  it("tableau avec ou sans séparateur", () => {
    expect(lireBlocs("| Constat | Pénalité |\n| --- | --- |\n| Rayures | $500 |")).toEqual([
      { type: "tableau", entetes: ["Constat", "Pénalité"], lignes: [["Rayures", "$500"]] },
    ]);
    expect(lireBlocs("| A | B |\n| 1 | 2 |")[0]).toEqual({
      type: "tableau",
      entetes: ["A", "B"],
      lignes: [["1", "2"]],
    });
  });

  it("règlement initial : 6 articles, clauses numérotées et tableau des dégâts", () => {
    const blocs = reglement.articles.map((a) => lireBlocs(a.contenu));
    expect(blocs.map((b) => b.filter((x) => x.type === "clause").length)).toEqual([
      4, 3, 3, 3, 1, 3,
    ]);
    expect(blocs[1].at(-1)?.type).toBe("encadre");
    const tableau = blocs[4].find((b) => b.type === "tableau");
    expect(tableau && tableau.type === "tableau" && tableau.lignes).toHaveLength(5);
  });

  it("ignore les blocs vides et les fins de ligne Windows", () => {
    expect(lireBlocs("\r\n\r\n**1.1** A\r\n\r\n\r\n")).toEqual([
      { type: "clause", numero: "1.1", texte: "A" },
    ]);
  });
});

describe("lireEnLigne", () => {
  it("gras et liens internes", () => {
    expect(lireEnLigne("Voir le **règlement** dans [la page](/reglement).")).toEqual([
      { type: "texte", texte: "Voir le " },
      { type: "gras", texte: "règlement" },
      { type: "texte", texte: " dans " },
      { type: "lien", texte: "la page", href: "/reglement" },
      { type: "texte", texte: "." },
    ]);
  });

  it("refuse les liens externes et javascript:", () => {
    const morceaux = lireEnLigne(
      "[a](https://exemple.com) [b](javascript:alert(1)) [c](//x.fr) [d](#art-1)",
    );
    expect(morceaux.filter((m) => m.type === "lien")).toEqual([
      { type: "lien", texte: "d", href: "#art-1" },
    ]);
    expect(morceaux.map((m) => m.texte).join("")).toContain("a b");
  });
});
