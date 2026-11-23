import { describe, expect, it } from "vitest";
import {
  ajusterStock,
  calculerVente,
  remisePourcent,
  resumeLignes,
  correspondRecherche,
  etatCarte,
  filtrerCatalogue,
  filtresActifs,
  FILTRES_PAR_DEFAUT,
  verifierNouvelOrdre,
  type FiltresCatalogue,
  montantVente,
  motifVente,
  regrouperCartes,
  verifierStock,
} from "./cards";
import { cleCompteurVentes, numeroVente } from "./numerotation";
import { pieceAbregee } from "./comptabilite";

describe("ventes de cartes", () => {
  it("montant = prix unitaire × quantité, en entiers", () => {
    expect(montantVente(250, 3)).toBe(750);
    expect(montantVente(0, 2)).toBe(0);
  });
  it.each([
    [250, 0],
    [250, -1],
    [250, 1.5],
    [-1, 1],
    [2.5, 1],
    [Number.MAX_SAFE_INTEGER, 2],
  ])("refuse prix %d × quantité %d", (prix, quantite) => {
    expect(() => montantVente(prix, quantite)).toThrow();
  });
  it("stock : décrément, refus au-delà, message pour une carte épuisée", () => {
    expect(verifierStock(5, 2)).toBe(3);
    expect(verifierStock(1, 1)).toBe(0);
    expect(() => verifierStock(1, 2)).toThrow("Stock insuffisant : 1 exemplaire restant.");
    expect(() => verifierStock(3, 4)).toThrow("Stock insuffisant : 3 exemplaires restants.");
    expect(() => verifierStock(0, 1)).toThrow("Cette carte est épuisée.");
  });
  it("état public du stock", () => {
    expect(etatCarte(0)).toEqual({ epuisee: true, libelle: "Épuisée" });
    expect(etatCarte(1)).toEqual({ epuisee: false, libelle: "1 exemplaire" });
    expect(etatCarte(12)).toEqual({ epuisee: false, libelle: "12 exemplaires" });
  });
  it("numérotation BPC et pièce abrégée", () => {
    expect(numeroVente(2026, 1)).toBe("BPC-2026-0001");
    expect(cleCompteurVentes(2026)).toBe("BPC-2026");
    expect(pieceAbregee(numeroVente(2026, 7))).toBe("BPC-0007");
  });
  it("motif du registre", () => {
    expect(
      motifVente({ lignes: [{ carteNom: "Dragon d’or", quantite: 2 }], clientNom: "Ada" }),
    ).toBe("Vente de cartes · 2 × Dragon d’or · Ada");
  });
});

describe("catalogue", () => {
  it("regroupe par catégorie, trie catégories et cartes, sans mutation", () => {
    const rares = { id: "r", nom: "Rares", ordre: 1 };
    const base = { id: "b", nom: "Base", ordre: 0 };
    const cartes = [
      { nom: "Zèbre", ordre: 0, categorie: rares },
      { nom: "Aigle", ordre: 0, categorie: rares },
      { nom: "Loup", ordre: 1, categorie: base },
      { nom: "Ours", ordre: 0, categorie: base },
    ];
    const copie = [...cartes];
    const g = regrouperCartes(cartes);
    expect(g.map((x) => x.categorie.nom)).toEqual(["Base", "Rares"]);
    expect(g[0].cartes.map((c) => c.nom)).toEqual(["Ours", "Loup"]);
    expect(g[1].cartes.map((c) => c.nom)).toEqual(["Aigle", "Zèbre"]);
    expect(cartes).toEqual(copie);
  });
  it("à ordre égal, les catégories se trient par nom", () => {
    const a = { id: "a", nom: "Été", ordre: 0 };
    const b = { id: "b", nom: "Automne", ordre: 0 };
    expect(
      regrouperCartes([
        { nom: "x", ordre: 0, categorie: a },
        { nom: "y", ordre: 0, categorie: b },
      ]).map((g) => g.categorie.nom),
    ).toEqual(["Automne", "Été"]);
  });
  it("recherche sans casse ni accents", () => {
    expect(correspondRecherche("Dragon Écarlate", "ecar")).toBe(true);
    expect(correspondRecherche("Dragon Écarlate", "  ")).toBe(true);
    expect(correspondRecherche("Dragon Écarlate", "loup")).toBe(false);
  });
});

describe("catalogue à gros volume (R-3)", () => {
  it("nouvel ordre : mêmes éléments, sans doublon", () => {
    expect(() => verifierNouvelOrdre(["a", "b", "c"], ["c", "a", "b"])).not.toThrow();
    expect(() => verifierNouvelOrdre(["a", "b"], ["a", "a"])).toThrow("rechargez");
    expect(() => verifierNouvelOrdre(["a", "b"], ["a"])).toThrow("rechargez");
    expect(() => verifierNouvelOrdre(["a", "b"], ["a", "x"])).toThrow("rechargez");
  });

  it("ajustement du stock", () => {
    expect(ajusterStock(2, 1)).toBe(3);
    expect(ajusterStock(1, -1)).toBe(0);
    expect(() => ajusterStock(0, -1)).toThrow("négatif");
    expect(() => ajusterStock(100_000, 1)).toThrow("maximum");
    expect(() => ajusterStock(3, 0)).toThrow("invalide");
    expect(() => ajusterStock(3, 0.5)).toThrow("invalide");
  });

  it("filtres de l'écran Cartes", () => {
    const cartes = [
      { nom: "Pégase d'ébène", visible: true, stock: 1 },
      { nom: "Dragon", visible: false, stock: 0 },
      { nom: "Pegase blanc", visible: true, stock: 0 },
    ];
    const f = (p: Partial<FiltresCatalogue>) =>
      filtrerCatalogue(cartes, { ...FILTRES_PAR_DEFAUT, ...p }).map((c) => c.nom);
    expect(f({})).toHaveLength(3);
    expect(f({ q: "pegase" })).toEqual(["Pégase d'ébène", "Pegase blanc"]);
    expect(f({ visibilite: "masquees" })).toEqual(["Dragon"]);
    expect(f({ stock: "enStock" })).toEqual(["Pégase d'ébène"]);
    expect(f({ stock: "epuisees", visibilite: "visibles" })).toEqual(["Pegase blanc"]);
    const avecEnchere = [
      ...cartes,
      { nom: "Licorne", visible: true, stock: 1, enchere: { id: "e" } },
    ];
    expect(
      filtrerCatalogue(avecEnchere, { ...FILTRES_PAR_DEFAUT, mode: "enchere" }).map((c) => c.nom),
    ).toEqual(["Licorne"]);
    expect(filtrerCatalogue(avecEnchere, { ...FILTRES_PAR_DEFAUT, mode: "vente" })).toHaveLength(3);
    expect(filtresActifs({ ...FILTRES_PAR_DEFAUT, mode: "vente" })).toBe(true);
    expect(filtresActifs(FILTRES_PAR_DEFAUT)).toBe(false);
    expect(filtresActifs({ ...FILTRES_PAR_DEFAUT, q: " " })).toBe(false);
    expect(filtresActifs({ ...FILTRES_PAR_DEFAUT, stock: "epuisees" })).toBe(true);
  });
});

describe("vente de plusieurs cartes (R-4)", () => {
  const cartes = [
    { id: "a", nom: "Dragon", prix: 1800, stock: 2 },
    { id: "b", nom: "Kraken", prix: 1200, stock: 1 },
    { id: "c", nom: "Mouette", prix: 0, stock: 5 },
  ];

  it("lignes, total du catalogue et stock restant", () => {
    const v = calculerVente(
      cartes,
      [
        { carteId: "a", quantite: 2 },
        { carteId: "b", quantite: 1 },
      ],
      null,
    );
    expect(v).toMatchObject({ montantCatalogue: 4800, montant: 4800, remise: 0 });
    expect(v.lignes.map((l) => [l.carteNom, l.montant, l.stockRestant])).toEqual([
      ["Dragon", 3600, 0],
      ["Kraken", 1200, 0],
    ]);
  });

  it("montant encaissé : remise possible, jamais au-dessus du catalogue", () => {
    const une = [{ carteId: "a", quantite: 1 }];
    expect(calculerVente(cartes, une, 1500)).toMatchObject({ montant: 1500, remise: 300 });
    expect(calculerVente(cartes, une, 1800).remise).toBe(0);
    expect(() => calculerVente(cartes, une, 1801)).toThrow("ne peut pas dépasser");
    expect(() => calculerVente(cartes, une, 0)).toThrow("au moins $1");
    expect(() => calculerVente(cartes, une, 99.5)).toThrow("entier");
  });

  it("refus : vide, doublon, carte inconnue, stock insuffisant, sans prix", () => {
    expect(() => calculerVente(cartes, [], null)).toThrow("au moins une carte");
    expect(() =>
      calculerVente(
        cartes,
        [
          { carteId: "a", quantite: 1 },
          { carteId: "a", quantite: 1 },
        ],
        null,
      ),
    ).toThrow("deux fois");
    expect(() => calculerVente(cartes, [{ carteId: "x", quantite: 1 }], null)).toThrow(
      "introuvable",
    );
    expect(() => calculerVente(cartes, [{ carteId: "b", quantite: 2 }], null)).toThrow(
      "Kraken : Stock insuffisant",
    );
    expect(() => calculerVente(cartes, [{ carteId: "c", quantite: 1 }], null)).toThrow(
      "pas de prix",
    );
    expect(() =>
      calculerVente(
        cartes,
        Array.from({ length: 51 }, (_, i) => ({ carteId: `x${i}`, quantite: 1 })),
        null,
      ),
    ).toThrow("50 cartes");
  });

  it("résumé, motif et remise en pourcentage", () => {
    expect(
      resumeLignes([
        { carteNom: "Dragon", quantite: 2 },
        { carteNom: "Kraken", quantite: 1 },
      ]),
    ).toBe("2 × Dragon, Kraken");
    expect(resumeLignes(["A", "B", "C", "D"].map((carteNom) => ({ carteNom, quantite: 2 })))).toBe(
      "4 cartes (8 exemplaires)",
    );
    expect(
      motifVente({ lignes: [{ carteNom: "Dragon", quantite: 1 }], clientNom: "Ada", remise: 300 }),
    ).toBe("Vente de cartes · Dragon · Ada · remise $300");
    expect(remisePourcent(300, 1800)).toBe(17);
    expect(remisePourcent(0, 0)).toBe(0);
  });
});
