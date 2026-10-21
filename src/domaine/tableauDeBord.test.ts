// Tableau de bord (maquette 11) : chiffres attendus avec les données de démonstration.
import { describe, expect, it } from "vitest";
import demo from "../../docs/handoff/data/demo-semaine-43.json";
import {
  impotsReglees,
  recettesParSemaine,
  variationPourcent,
  type MouvementComptable,
} from "./comptabilite";
import { formaterRetourPrevu } from "./contrats";
import { depuisHeureServeur } from "./dates";
import { graduation } from "./solde";
import type { CategorieMouvement, Sens } from "./types";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);
const NBSP = String.fromCharCode(0xa0);
const s43: MouvementComptable[] = demo.mouvements.map((m) => ({
  numero: `2026-${m.numero}`,
  sens: m.sens as Sens,
  categorie: m.categorie as CategorieMouvement,
  montant: m.montant,
}));

describe("tableau de bord", () => {
  it("chiffre d'affaires : +8,0 % vs S42", () => {
    expect(variationPourcent(91400, 84600)).toBe(`+8,0${NBSP}%`);
    expect(variationPourcent(50, 100)).toBe(`−50,0${NBSP}%`);
    expect(variationPourcent(10, 0)).toBeNull();
  });

  it("dépenses : dont impôts $12 600", () => {
    expect(impotsReglees(s43)).toBe(12600);
    expect(
      impotsReglees([
        { numero: "1", sens: "SORTIE", categorie: "IMPOTS", montant: 500 },
        { numero: "2", sens: "ENTREE", categorie: "IMPOTS", montant: 500, annuleMouvementId: "x" },
      ]),
    ).toBe(0);
  });

  it("recettes des 8 semaines, semaine en cours en dernier", () => {
    const fenetre = [36, 37, 38, 39, 40, 41, 42, 43].map((n) => ({ id: `2026-S${n}`, numero: n }));
    const r = recettesParSemaine(
      [
        {
          id: "2026-S42",
          mouvements: [{ numero: "a", sens: "ENTREE", categorie: "LOCATION", montant: 84600 }],
        },
        { id: "2026-S43", mouvements: s43 },
      ],
      fenetre,
    );
    expect(r.map((x) => x.recettes)).toEqual([0, 0, 0, 0, 0, 0, 84600, 91400]);
    expect(r.at(-1)).toMatchObject({ libelle: "S43", courante: true });
    expect(r.filter((x) => x.courante)).toHaveLength(1);
  });

  it("graduation de l'axe : 0 à 100k par 25k", () => {
    expect(graduation(91400)).toEqual([0, 25000, 50000, 75000, 100000]);
    expect(graduation(100000)).toEqual([0, 25000, 50000, 75000, 100000]);
    expect(graduation(7000)).toEqual([0, 2000, 4000, 6000, 8000]);
    expect(graduation(0)).toEqual([0, 1, 2, 3, 4]);
  });

  it("retour prévu : heure le jour même, jour abrégé sinon", () => {
    const m = h(demo.maintenant);
    expect(formaterRetourPrevu(h("2026-10-24T21:00"), m, PARIS)).toBe("21:00");
    expect(formaterRetourPrevu(h("2026-10-25T00:00"), m, PARIS)).toBe("Dim. 00:00");
    expect(formaterRetourPrevu(h("2026-10-25T08:00"), m, PARIS)).toBe("Dim. 08:00");
  });
});
