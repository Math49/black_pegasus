import { describe, expect, it } from "vitest";
import {
  dureeEnHeures,
  formaterDureeEnchere,
  phaseEnchere,
  etatEnchere,
  finInitiale,
  formaterTempsRestant,
  meilleureOffre,
  montantMinimum,
  nouvelleFin,
  offresValides,
  schemaOffre,
  verifierOffre,
  verifierParametresEnchere,
} from "./encheres";

const t = (iso: string) => new Date(`2026-11-23T${iso}:00Z`);
const offre = (montant: number, heure: string, invalidee = false) => ({
  montant,
  date: t(heure),
  invalidee,
});
const enchere = {
  statut: "OUVERTE" as const,
  montantDepart: 1000,
  pasMinimum: 100,
  finPrevue: t("20:00"),
};

describe("enchères", () => {
  it("paramètres : entiers dans leurs bornes", () => {
    const ok = { montantDepart: 1000, pasMinimum: 50, dureeHeures: 24, tempsAdditionnelMin: 5 };
    expect(() => verifierParametresEnchere(ok)).not.toThrow();
    expect(() => verifierParametresEnchere({ ...ok, tempsAdditionnelMin: 0 })).not.toThrow();
    expect(() => verifierParametresEnchere({ ...ok, montantDepart: 0 })).toThrow(
      "Montant de départ",
    );
    expect(() => verifierParametresEnchere({ ...ok, pasMinimum: 1.5 })).toThrow("Pas minimum");
    expect(() => verifierParametresEnchere({ ...ok, dureeHeures: 721 })).toThrow("entre 1 heure et 30 jours");
    expect(finInitiale(t("10:00"), 24).toISOString()).toBe("2026-11-24T10:00:00.000Z");
  });

  it("offres retenues, meilleure offre et minimum suivant", () => {
    const offres = [offre(1200, "10:00"), offre(1500, "11:00", true), offre(1300, "12:00")];
    expect(offresValides(offres).map((o) => o.montant)).toEqual([1300, 1200]);
    expect(meilleureOffre(offres)?.montant).toBe(1300);
    expect(montantMinimum(enchere, offres)).toBe(1400);
    expect(montantMinimum(enchere, [])).toBe(1000);
    expect(meilleureOffre([offre(900, "09:00", true)])).toBeNull();
  });

  it("prolongation seulement pour une offre tardive", () => {
    // Il reste 2 min, temps additionnel 5 min : la fin passe à l'offre + 5 min.
    expect(nouvelleFin(t("20:00"), t("19:58"), 5).toISOString()).toBe("2026-11-23T20:03:00.000Z");
    // Il reste 1 h : rien ne change.
    expect(nouvelleFin(t("20:00"), t("19:00"), 5).toISOString()).toBe("2026-11-23T20:00:00.000Z");
    expect(nouvelleFin(t("20:00"), t("19:59"), 0).toISOString()).toBe("2026-11-23T20:00:00.000Z");
  });

  it("état affiché", () => {
    expect(etatEnchere(enchere, [], t("19:00"))).toBe("en_cours");
    expect(etatEnchere(enchere, [offre(1000, "18:00")], t("20:00"))).toBe("a_conclure");
    expect(etatEnchere(enchere, [offre(1000, "18:00", true)], t("21:00"))).toBe("sans_offre");
    expect(etatEnchere({ ...enchere, statut: "CONCLUE" }, [], t("21:00"))).toBe("conclue");
    expect(etatEnchere({ ...enchere, statut: "ANNULEE" }, [], t("10:00"))).toBe("annulee");
  });

  it("validité d'une offre", () => {
    const offres = [offre(1200, "10:00")];
    expect(() => verifierOffre(enchere, offres, 1300, t("19:00"))).not.toThrow();
    // Surenchérir sur sa propre offre est permis : seul le montant compte.
    expect(() => verifierOffre(enchere, offres, 1299, t("19:00"))).toThrow(/au moins \$1.300/);
    expect(() => verifierOffre(enchere, [], 999, t("19:00"))).toThrow(/au moins \$1.000/);
    expect(() => verifierOffre(enchere, offres, 5000, t("20:00"))).toThrow("terminée");
    expect(() => verifierOffre({ ...enchere, statut: "ANNULEE" }, [], 5000, t("10:00"))).toThrow(
      "terminée",
    );
    expect(() => verifierOffre(enchere, [], 0, t("10:00"))).toThrow("entier");
  });

  it("coordonnées de l'offre publique", () => {
    expect(schemaOffre.parse({ nom: " Ada ", telephone: "555-0101", montant: "1 500 $" })).toEqual({
      nom: "Ada",
      telephone: "555-0101",
      montant: 1500,
    });
    expect(() => schemaOffre.parse({ nom: "A", telephone: "555", montant: "1" })).toThrow("Nom");
    expect(() => schemaOffre.parse({ nom: "Ada", telephone: "abc", montant: "1" })).toThrow(
      "Téléphone",
    );
    expect(() => schemaOffre.parse({ nom: "Ada", telephone: "555", montant: "12,5" })).toThrow(
      "Montant",
    );
  });

  it("temps restant", () => {
    expect(formaterTempsRestant(0)).toBe("Terminée");
    expect(formaterTempsRestant(-5)).toBe("Terminée");
    expect(formaterTempsRestant(248_000)).toBe("4 min 08 s");
    expect(formaterTempsRestant(3 * 3_600_000 + 12 * 60_000)).toBe("3 h 12 min");
    expect(formaterTempsRestant(2 * 86_400_000 + 5 * 3_600_000)).toBe("2 j 5 h");
    expect(formaterTempsRestant(86_400_000)).toBe("1 j");
  });
});

describe("durée et temps additionnel", () => {
  it("saisie en heures ou en jours, affichage compact", () => {
    expect(dureeEnHeures(10, "jours")).toBe(240);
    expect(dureeEnHeures(1, "heures")).toBe(1);
    expect(formaterDureeEnchere(240)).toBe("10 j");
    expect(formaterDureeEnchere(36)).toBe("1 j 12 h");
    expect(formaterDureeEnchere(1)).toBe("1 h");
  });

  it("la durée d'abord, puis le temps additionnel s'il y a prolongation", () => {
    const e = { debut: t("18:00"), dureeHeures: 2, finPrevue: t("20:08") };
    expect(phaseEnchere(e, t("19:00"))).toEqual({ phase: "duree", fin: t("20:00") });
    expect(phaseEnchere(e, t("20:03"))).toEqual({ phase: "additionnel", fin: t("20:08") });
    expect(phaseEnchere(e, t("20:08"))).toEqual({ phase: "terminee", fin: t("20:08") });
    // Sans prolongation, la fin de la durée est la fin de l'enchère.
    expect(phaseEnchere({ ...e, finPrevue: t("20:00") }, t("20:00")).phase).toBe("terminee");
  });
});
