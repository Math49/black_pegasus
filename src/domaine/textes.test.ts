import { describe, expect, it } from "vitest";
import { decouperTitre, segmenterTexte, texteBrut, type ContexteTextes } from "./textes";

const NBSP = String.fromCharCode(0xa0);
const ctx: ContexteTextes = {
  telephone: "555-0100",
  horaires: "Tous les jours · 14h – 02h",
  toleranceRetardMin: 15,
  majorationRetard: 0.5,
  seuilDefautRestitutionMin: 180,
  forfaitsDegats: [{ libelle: "Réservoir non refait", montant: 1250 }],
};

describe("segmenterTexte", () => {
  it("met le téléphone à part", () => {
    expect(segmenterTexte("Composez le {{telephone}}. Merci.", ctx)).toEqual([
      { type: "texte", valeur: "Composez le " },
      { type: "telephone", valeur: "555-0100" },
      { type: "texte", valeur: ". Merci." },
    ]);
  });

  it("remplace les règles de location depuis Parametres", () => {
    expect(
      texteBrut(
        "Tolérance {{toleranceRetardMin}} min, majoration {{ majorationRetardPourcent }} %, défaut après {{seuilDefautRestitutionHeures}} h.",
        ctx,
      ),
    ).toBe("Tolérance 15 min, majoration 50 %, défaut après 3 h.");
    expect(
      texteBrut("{{seuilDefautRestitutionHeures}} / {{majorationRetardPourcent}}", {
        ...ctx,
        seuilDefautRestitutionMin: 90,
        majorationRetard: 0.255,
      }),
    ).toBe("1,5 / 25,5");
  });

  it("forfaits de dégâts formatés en dollars", () => {
    expect(texteBrut("{{forfait:Réservoir non refait}}", ctx)).toBe(`$1${NBSP}250`);
  });

  it("variable inconnue ou forfait absent : laissé tel quel", () => {
    expect(texteBrut("{{inconnue}} {{forfait:Rayures}}", ctx)).toBe(
      "{{inconnue}} {{forfait:Rayures}}",
    );
  });

  it("horaires et texte sans variable", () => {
    expect(texteBrut("Ouvert : {{horaires}}", ctx)).toBe("Ouvert : Tous les jours · 14h – 02h");
    expect(segmenterTexte("Simple", ctx)).toEqual([{ type: "texte", valeur: "Simple" }]);
    expect(segmenterTexte("", ctx)).toEqual([]);
  });
});

describe("decouperTitre", () => {
  it("accent entre astérisques", () => {
    expect(decouperTitre("Le ciel et l’océan, *à votre mesure*")).toEqual([
      { texte: "Le ciel et l’océan, ", accent: false },
      { texte: "à votre mesure", accent: true },
    ]);
  });

  it("sans accent", () => {
    expect(decouperTitre("Règlement")).toEqual([{ texte: "Règlement", accent: false }]);
    expect(decouperTitre("a ** b")).toEqual([{ texte: "a ** b", accent: false }]);
  });
});
