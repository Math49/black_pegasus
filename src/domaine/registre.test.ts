// Registre hebdomadaire et ventilation de la déclaration (maquettes 19, 31, 32).
import { describe, expect, it } from "vitest";
import demo from "../../docs/handoff/data/demo-semaine-43.json";
import {
  colonneRegistre,
  compteursOnglets,
  filtrerRegistre,
  pieceAbregee,
  registreCsv,
  totauxRegistre,
  ventilation,
} from "./comptabilite";
import type { CategorieMouvement, Sens } from "./types";

const s43 = demo.mouvements.map((m) => ({
  numero: `2026-${m.numero}`,
  sens: m.sens as Sens,
  categorie: m.categorie as CategorieMouvement,
  montant: m.montant,
  contratId: m.contrat,
}));

describe("registre de la semaine 43", () => {
  it("onglets Toutes 35 · Recettes 13 · Dépenses 5 · Cautions 17", () => {
    expect(compteursOnglets(s43)).toEqual({ toutes: 35, recettes: 13, depenses: 5, cautions: 17 });
    expect(filtrerRegistre(s43, "depenses").every((m) => m.sens === "SORTIE")).toBe(true);
  });

  it("totaux : +$91 400 · −$24 150 · +$35 000", () => {
    expect(totauxRegistre(s43)).toEqual({
      recette: 91400,
      depense: 24150,
      caution: 35000,
      apport: 0,
    });
  });

  it("colonnes, contre-passation en négatif, apport à part", () => {
    expect(colonneRegistre({ sens: "SORTIE", categorie: "IMPOTS", montant: 12600 })).toEqual({
      colonne: "depense",
      montant: 12600,
    });
    expect(colonneRegistre({ sens: "SORTIE", categorie: "CAUTION_RENDUE", montant: 1000 })).toEqual(
      {
        colonne: "caution",
        montant: -1000,
      },
    );
    expect(colonneRegistre({ sens: "SORTIE", categorie: "LOCATION", montant: 300 })).toEqual({
      colonne: "recette",
      montant: -300,
    });
    expect(colonneRegistre({ sens: "ENTREE", categorie: "APPORT", montant: 500 }).colonne).toBe(
      "apport",
    );
  });

  it("ventilation de la synthèse (maquette 31)", () => {
    expect(ventilation(s43)).toEqual({
      locations: 90000,
      contratsLoues: 11,
      penalites: 1400,
      impots: 12600,
      entretien: 4700,
      achats: 0,
      divers: 6850,
      formation: 0,
      ventesCartes: 0,
      achatsStock: 0,
    });
  });

  it("pièce abrégée", () => {
    expect(pieceAbregee("CTR-2026-0031")).toBe("CTR-0031");
    expect(pieceAbregee("JUST-43-01")).toBe("JUST-43-01");
  });
});

describe("export CSV", () => {
  it("colonnes, échappement et neutralisation des formules", () => {
    const csv = registreCsv([
      {
        numero: "OP-43-001",
        date: "2026-10-19 09:15",
        categorie: "Impôts",
        filiale: "Groupe",
        libelle: 'Impôt S42; réglé "FISC"',
        piece: "JUST-43-01",
        sens: "SORTIE",
        categorieCode: "IMPOTS",
        montant: 12600,
      },
      {
        numero: "OP-43-002",
        date: "2026-10-19 14:00",
        categorie: "Caution rendue",
        libelle: "=HYPERLINK()",
        piece: "CTR-2026-0031",
        sens: "SORTIE",
        categorieCode: "CAUTION_RENDUE",
        montant: 1000,
        mention: "Annulé par OP-43-010",
      },
    ]);
    const lignes = csv.split("\r\n");
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(lignes[0]).toBe(
      "\uFEFFN°;Date;Catégorie;Filiale;Libellé;Pièce;Recette;Dépense;Caution;Apport;Mention",
    );
    expect(lignes[1]).toBe(
      'OP-43-001;2026-10-19 09:15;Impôts;Groupe;"Impôt S42; réglé ""FISC""";JUST-43-01;;12600;;;',
    );
    expect(lignes[2]).toBe(
      "OP-43-002;2026-10-19 14:00;Caution rendue;;'=HYPERLINK();CTR-2026-0031;;;-1000;;Annulé par OP-43-010",
    );
  });
});
