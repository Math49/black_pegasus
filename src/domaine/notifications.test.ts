import { describe, expect, it } from "vitest";
import {
  depuisHeureServeur,
  formaterDateLongue,
  formaterHeure,
  formaterJourCourt,
  salutation,
} from "./dates";
import { formaterDuree, notificationsPanel } from "./notifications";
import { decisionConnexion, LIBELLES_ROLE } from "./permissions";

const PARIS = "Europe/Paris";
const h = (t: string) => depuisHeureServeur(t, PARIS);

describe("notificationsPanel", () => {
  const contrats = [
    { numero: "CTR-2026-0038", clientNom: "Kenji Mori", finPrevue: h("2026-10-24T22:00") },
    { numero: "CTR-2026-0041", clientNom: "Marisol Vega", finPrevue: h("2026-10-24T20:30") },
    { numero: "CTR-2026-0039", clientNom: "Chen Wu", finPrevue: h("2026-10-24T21:00") },
  ];

  it("retards triés, semaine précédente ouverte, dépenses sans justificatif", () => {
    expect(
      notificationsPanel({
        contratsEnCours: contrats,
        semainePrecedenteOuverte: 42,
        depensesSansJustificatif: ["OP-43-021", "OP-43-027"],
        maintenant: h("2026-10-24T21:40"),
        fuseau: PARIS,
      }),
    ).toEqual([
      {
        cle: "retard:CTR-2026-0041",
        type: "retard",
        message: "CTR-2026-0041 · Marisol Vega : retard de 1 h 10",
        href: "/admin/contrats",
      },
      {
        cle: "retard:CTR-2026-0039",
        type: "retard",
        message: "CTR-2026-0039 · Chen Wu : retard de 40 min",
        href: "/admin/contrats",
      },
      {
        cle: "semaine",
        type: "semaine",
        message: "La semaine 42 n’est pas encore clôturée",
        href: "/admin/comptabilite",
      },
      {
        cle: "justificatifs",
        type: "justificatif",
        message: "2 dépenses sans justificatif (OP-43-021, OP-43-027)",
        href: "/admin/solde",
      },
    ]);
  });

  it("une seule dépense, rien d'autre", () => {
    const n = notificationsPanel({
      contratsEnCours: [],
      semainePrecedenteOuverte: null,
      depensesSansJustificatif: ["OP-43-021"],
      maintenant: h("2026-10-24T21:40"),
      fuseau: PARIS,
    });
    expect(n.map((x) => x.message)).toEqual(["OP-43-021 : dépense sans justificatif"]);
  });

  it("aucune notification", () => {
    expect(
      notificationsPanel({
        contratsEnCours: contrats,
        semainePrecedenteOuverte: null,
        depensesSansJustificatif: [],
        maintenant: h("2026-10-24T20:00"),
        fuseau: PARIS,
      }),
    ).toEqual([]);
  });

  it("durées", () => {
    expect(formaterDuree(0)).toBe("0 min");
    expect(formaterDuree(40)).toBe("40 min");
    expect(formaterDuree(60)).toBe("1 h");
    expect(formaterDuree(70)).toBe("1 h 10");
    expect(formaterDuree(605)).toBe("10 h 05");
  });
});

describe("dates du panel", () => {
  it("formats", () => {
    expect(formaterDateLongue(h("2026-10-24T21:40"), PARIS)).toBe("samedi 24 octobre 2026 · 21:40");
    expect(formaterJourCourt(h("2026-10-25T00:00"), PARIS)).toBe("dimanche 25/10");
    expect(formaterHeure(h("2026-10-25T08:05"), PARIS)).toBe("08:05");
  });

  it("salutation", () => {
    expect(salutation(h("2026-10-24T21:40"), PARIS)).toBe("Bonsoir");
    expect(salutation(h("2026-10-24T04:59"), PARIS)).toBe("Bonsoir");
    expect(salutation(h("2026-10-24T05:00"), PARIS)).toBe("Bonjour");
    expect(salutation(h("2026-10-24T17:59"), PARIS)).toBe("Bonjour");
  });
});

describe("connexion", () => {
  it("décision selon le compte (HANDOFF § 7.10)", () => {
    expect(decisionConnexion(null)).toBe("inconnu");
    expect(decisionConnexion({ actif: false })).toBe("inactif");
    expect(decisionConnexion({ actif: true })).toBe("autorise");
  });

  it("libellés des rôles", () => {
    expect(LIBELLES_ROLE.ADMIN).toBe("Administrateur");
    expect(LIBELLES_ROLE.GESTIONNAIRE).toBe("Gestionnaire");
  });
});
