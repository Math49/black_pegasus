import { describe, expect, it } from "vitest";
import {
  ajouterHeuresHorloge,
  bilanCloture,
  echeance,
  formaterDateComplete,
  formaterJourHeure,
  lignesTarification,
  mouvementsCreation,
} from "./contrats";
import { depuisHeureServeur } from "./dates";
import { tarifPourHeures } from "./tarif";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);
const REGLES = {
  toleranceRetardMin: 15,
  majorationRetard: 0.5,
  seuilDefautRestitutionMin: 180,
  penalitesSurCaution: false,
};
const SEASHARK = {
  vehiculeNom: "Seashark2",
  prixHeure: 150,
  caution: 1000,
  finPrevue: h("2026-10-24T21:00"),
};

describe("mouvementsCreation (CONCEPTION § 6.1)", () => {
  it("Toro2 12 h : caution $5 000 puis location $3 600 au journalier", () => {
    expect(
      mouvementsCreation({
        vehiculeNom: "Toro2",
        clientNom: "Elena Marchetti",
        caution: 5000,
        tarif: tarifPourHeures(12, 600, 3600),
      }),
    ).toEqual([
      {
        sens: "ENTREE",
        categorie: "CAUTION_ENCAISSEE",
        montant: 5000,
        motif: "Toro2 · Elena Marchetti",
      },
      {
        sens: "ENTREE",
        categorie: "LOCATION",
        montant: 3600,
        motif: "Toro2 · 12 h, tarif journalier",
      },
    ]);
  });

  it("libellé des maquettes au tarif horaire ; pas de caution nulle", () => {
    const m = mouvementsCreation({
      vehiculeNom: "Seashark2",
      clientNom: "Chen Wu",
      caution: 0,
      tarif: tarifPourHeures(2, 150, 900),
    });
    expect(m).toEqual([
      { sens: "ENTREE", categorie: "LOCATION", montant: 300, motif: "Seashark2 · 2 h" },
    ]);
  });
});

describe("bilanCloture (CONCEPTION § 6.2, maquette 18)", () => {
  it("Seashark2 rendu avec 40 min de retard : pénalité $225, caution $1 000 rendue", () => {
    const b = bilanCloture({
      contrat: SEASHARK,
      retourReel: h("2026-10-24T21:40"),
      forfaitsCoches: [],
      regles: REGLES,
      fuseau: PARIS,
    });
    expect(b.penalites).toBe(225);
    expect(b.cautionRestituee).toBe(1000);
    expect(b.resteADu).toBe(225);
    expect(b.mouvements).toEqual([
      {
        sens: "ENTREE",
        categorie: "PENALITE",
        montant: 225,
        motif: "Retard de 40 min (1 h facturée)",
      },
      { sens: "SORTIE", categorie: "CAUTION_RENDUE", montant: 1000, motif: "Seashark2 restitué" },
    ]);
  });

  it("Toro2 70 min (CTR-2026-0032) et dégâts cochés", () => {
    const b = bilanCloture({
      contrat: {
        vehiculeNom: "Toro2",
        prixHeure: 600,
        caution: 5000,
        finPrevue: h("2026-10-19T22:00"),
      },
      retourReel: h("2026-10-19T23:10"),
      forfaitsCoches: [
        { libelle: "Rayures ou éraflures légères", montant: 500 },
        { libelle: "Réservoir non refait", montant: 250 },
      ],
      regles: REGLES,
      fuseau: PARIS,
    });
    expect(b.retard.penalite).toBe(900);
    expect(b.penaliteDegats).toBe(750);
    expect(b.mouvements.map((m) => [m.categorie, m.montant, m.motif])).toEqual([
      ["PENALITE", 900, "Retard de 1 h 10 (1 h facturée)"],
      ["PENALITE", 750, "Dégâts : Rayures ou éraflures légères, Réservoir non refait"],
      ["CAUTION_RENDUE", 5000, "Toro2 restitué"],
    ]);
  });

  it("à l'heure, sans dégât : seule la caution sort", () => {
    const b = bilanCloture({
      contrat: SEASHARK,
      retourReel: h("2026-10-24T21:10"),
      forfaitsCoches: [],
      regles: REGLES,
      fuseau: PARIS,
    });
    expect(b.mouvements).toEqual([
      { sens: "SORTIE", categorie: "CAUTION_RENDUE", montant: 1000, motif: "Seashark2 restitué" },
    ]);
    expect(b.penalites).toBe(0);
  });

  it("retard de plusieurs heures : pluriel", () => {
    const b = bilanCloture({
      contrat: SEASHARK,
      retourReel: h("2026-10-24T23:30"),
      forfaitsCoches: [],
      regles: REGLES,
      fuseau: PARIS,
    });
    expect(b.mouvements[0].motif).toBe("Retard de 2 h 30 (3 h facturées)");
  });

  it("variante : pénalités retenues sur la caution (minimum 0)", () => {
    const regles = { ...REGLES, penalitesSurCaution: true };
    const b = bilanCloture({
      contrat: SEASHARK,
      retourReel: h("2026-10-24T21:40"),
      forfaitsCoches: [{ libelle: "Dégât important", montant: 1000 }],
      regles,
      fuseau: PARIS,
    });
    expect(b.penalites).toBe(1225);
    expect(b.cautionRestituee).toBe(0);
    expect(b.resteADu).toBe(225);
    const sansReste = bilanCloture({
      contrat: SEASHARK,
      retourReel: h("2026-10-24T21:40"),
      forfaitsCoches: [],
      regles,
      fuseau: PARIS,
    });
    expect(sansReste.cautionRestituee).toBe(775);
    expect(sansReste.resteADu).toBe(0);
  });

  it("sans caution", () => {
    const b = bilanCloture({
      contrat: { ...SEASHARK, caution: 0 },
      retourReel: h("2026-10-24T21:00"),
      forfaitsCoches: [],
      regles: REGLES,
      fuseau: PARIS,
    });
    expect(b.mouvements).toEqual([]);
  });
});

describe("échéances (maquettes 11 et 16, à 21:40)", () => {
  const maintenant = h("2026-10-24T21:40");
  it.each([
    ["2026-10-24T21:00", "alerte", "Retard · 40 min"],
    ["2026-10-24T22:00", "ok", "Dans 20 min"],
    ["2026-10-24T23:00", "attenue", "Dans 1 h 20"],
    ["2026-10-25T00:00", "attenue", "Dans 2 h 20"],
    ["2026-10-25T08:00", "attenue", "Dans 10 h 20"],
  ])("%s → %s « %s »", (fin, ton, libelle) => {
    expect(echeance(h(fin), maintenant, PARIS)).toMatchObject({ ton, libelle });
  });
});

describe("formats et durées rapides", () => {
  it("dates", () => {
    expect(formaterJourHeure(h("2026-10-24T21:00"), PARIS)).toBe("Sam. 24/10 · 21:00");
    expect(formaterJourHeure(h("2026-10-25T00:00"), PARIS)).toBe("Dim. 25/10 · 00:00");
    expect(formaterDateComplete(h("2026-10-24T22:00"), PARIS)).toBe("Samedi 24/10/2026 · 22:00");
  });

  it("22:00 + 12 h d'horloge = 10:00 malgré le passage à l'heure d'hiver", () => {
    expect(ajouterHeuresHorloge(h("2026-10-24T22:00"), 12, PARIS)).toEqual(h("2026-10-25T10:00"));
    expect(ajouterHeuresHorloge(h("2026-10-24T22:00"), 1, PARIS)).toEqual(h("2026-10-24T23:00"));
  });

  it("lignes de tarification (PDF 30)", () => {
    const l = lignesTarification(tarifPourHeures(12, 600, 3600), 600, 3600);
    expect(l.horaire).toEqual({ detail: "12 h × $600", montant: 7200, applique: false });
    expect(l.journalier.applique).toBe(true);
    expect(l.journalier.detail).toBe(`1 j × $3${String.fromCharCode(0xa0)}600`);
    expect(
      lignesTarification(tarifPourHeures(12, 600, 3600), 600, 3600, true).journalier.detail,
    ).toBe(`1 jour × $3${String.fromCharCode(0xa0)}600`);
    expect(
      lignesTarification(tarifPourHeures(25, 4500, 28000), 4500, 28000).journalier.detail,
    ).toBe(`1 j × $28${String.fromCharCode(0xa0)}000 + 1 h`);
    expect(
      lignesTarification(tarifPourHeures(48, 4500, 28000), 4500, 28000).journalier.detail,
    ).toBe(`2 j × $28${String.fromCharCode(0xa0)}000`);
  });
});
