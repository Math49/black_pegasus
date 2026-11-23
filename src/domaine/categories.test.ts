import { describe, expect, it } from "vitest";
import {
  estCategorieSysteme,
  nomCategorie,
  sensAutorise,
  verifierArchivageCategorie,
  verifierCategorie,
  verifierSuppressionCategorie,
  type DefinitionCategorie,
  type SaisieCategorie,
} from "./categories";

const def = (p: Partial<DefinitionCategorie> = {}): DefinitionCategorie => ({
  id: "perso",
  nom: "Frais de bouche",
  sens: "SORTIE",
  filiale: null,
  justificatifObligatoire: true,
  systeme: false,
  archivee: false,
  ...p,
});
const saisie = (p: Partial<SaisieCategorie> = {}): SaisieCategorie => ({
  nom: "Frais de bouche",
  sens: "SORTIE",
  filiale: null,
  justificatifObligatoire: true,
  ...p,
});

describe("catégories de mouvements", () => {
  it("système et sens", () => {
    expect(estCategorieSysteme("LOCATION")).toBe(true);
    expect(estCategorieSysteme("IMPOTS")).toBe(true);
    expect(estCategorieSysteme("DIVERS")).toBe(false);
    expect(sensAutorise({ sens: "LES_DEUX" }, "ENTREE")).toBe(true);
    expect(sensAutorise({ sens: "SORTIE" }, "ENTREE")).toBe(false);
    expect(nomCategorie([{ id: "a", nom: "Alpha" }], "a")).toBe("Alpha");
    expect(nomCategorie([], "inconnue")).toBe("inconnue");
  });

  it("création : nom de 2 à 40 caractères, unique sans tenir compte de la casse", () => {
    const ok = { saisie: saisie(), utilisations: 0, nomsPris: ["Entretien"] };
    expect(() => verifierCategorie(ok)).not.toThrow();
    expect(() => verifierCategorie({ ...ok, saisie: saisie({ nom: " x " }) })).toThrow("Nom");
    expect(() => verifierCategorie({ ...ok, saisie: saisie({ nom: "a".repeat(41) }) })).toThrow(
      "Nom",
    );
    expect(() => verifierCategorie({ ...ok, saisie: saisie({ nom: " entretien " }) })).toThrow(
      "existe déjà",
    );
  });

  it("catégorie système : seulement renommée", () => {
    const systeme = def({ id: "IMPOTS", nom: "Impôts", systeme: true });
    const p = { existante: systeme, utilisations: 12, nomsPris: [] };
    expect(() =>
      verifierCategorie({ ...p, saisie: saisie({ nom: "Impôts et taxes" }) }),
    ).not.toThrow();
    expect(() => verifierCategorie({ ...p, saisie: saisie({ sens: "LES_DEUX" }) })).toThrow(
      "renommée",
    );
    expect(() => verifierCategorie({ ...p, saisie: saisie({ filiale: "BPL" }) })).toThrow(
      "renommée",
    );
    expect(() =>
      verifierCategorie({ ...p, saisie: saisie({ justificatifObligatoire: false }) }),
    ).toThrow("renommée");
  });

  it("catégorie utilisée : son sens ne peut que s'élargir", () => {
    const p = { existante: def(), utilisations: 3, nomsPris: [] };
    expect(() => verifierCategorie({ ...p, saisie: saisie({ sens: "LES_DEUX" }) })).not.toThrow();
    expect(() => verifierCategorie({ ...p, saisie: saisie({ sens: "ENTREE" }) })).toThrow("élargi");
    expect(() =>
      verifierCategorie({ ...p, utilisations: 0, saisie: saisie({ sens: "ENTREE" }) }),
    ).not.toThrow();
  });

  it("suppression et archivage", () => {
    expect(() => verifierSuppressionCategorie(def(), 0)).not.toThrow();
    expect(() => verifierSuppressionCategorie(def(), 2)).toThrow("archivez-la");
    expect(() => verifierSuppressionCategorie(def({ systeme: true }), 0)).toThrow("système");
    expect(() => verifierArchivageCategorie(def())).not.toThrow();
    expect(() => verifierArchivageCategorie(def({ systeme: true }))).toThrow("système");
  });
});
