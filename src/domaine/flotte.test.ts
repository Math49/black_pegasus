import { describe, expect, it } from "vitest";
import flotte from "../../docs/handoff/data/flotte.json";
import {
  categoriesDuType,
  ecrireFiltres,
  filtrerFlotte,
  histogrammePrix,
  lireFiltres,
  selectionException,
  trierFlotte,
  vehiculesSimilaires,
  vehiculeVedette,
  type VehiculeFlotte,
} from "./flotte";
import type { StatutExemplaire, TypeVehicule } from "./types";

// Flotte de démonstration, telle que le site la voit (véhicules visibles seulement).
const ordres = new Map<string, number>();
const tous: VehiculeFlotte[] = flotte.vehicules.map((v) => {
  const cle = `${v.type}:${v.categorie}`;
  if (!ordres.has(cle))
    ordres.set(cle, [...ordres.keys()].filter((k) => k.startsWith(`${v.type}:`)).length);
  return {
    slug: v.slug,
    nom: v.nom,
    type: v.type as TypeVehicule,
    categorie: v.categorie,
    ordreCategorie: ordres.get(cle)!,
    places: v.places,
    contenanceKg: v.contenanceKg,
    prixHeure: v.prixHeure,
    prixJour: v.prixJour,
    exemplaires: v.exemplaires.map((e) => ({ statut: e.statut as StatutExemplaire })),
  };
});
const visibles = tous.filter(
  (v) => flotte.vehicules.find((f) => f.slug === v.slug)!.visibleSurSite,
);
const slugs = (vs: VehiculeFlotte[]) => vs.map((v) => v.slug);
const filtres = (q: string) => lireFiltres(Object.fromEntries(new URLSearchParams(q)));

describe("lecture et écriture des filtres", () => {
  it("valeurs par défaut", () => {
    expect(lireFiltres({})).toEqual({
      type: "BATEAU",
      categories: null,
      places: null,
      contenance: null,
      prixMax: null,
      dispo: false,
      tri: "recommandes",
    });
  });

  it("aller-retour", () => {
    const q =
      "type=AVION&categorie=Jet+priv%C3%A9%2CSport&places=1-2&contenance=-100&prixMax=2000&dispo=1&tri=prix-croissant";
    const f = filtres(q);
    expect(f).toEqual({
      type: "AVION",
      categories: ["Jet privé", "Sport"],
      places: "1-2",
      contenance: "-100",
      prixMax: 2000,
      dispo: true,
      tri: "prix-croissant",
    });
    expect(filtres(ecrireFiltres(f))).toEqual(f);
    expect(ecrireFiltres(lireFiltres({}))).toBe("type=BATEAU");
  });

  it("valeurs invalides ignorées", () => {
    expect(filtres("type=VOITURE&places=9&prixMax=-3&tri=hasard&dispo=oui")).toEqual(
      lireFiltres({}),
    );
    expect(lireFiltres({ type: ["AVION", "BATEAU"] }).type).toBe("AVION");
    expect(filtres("categorie=").categories).toEqual([]);
  });
});

describe("filtrerFlotte", () => {
  it("bateaux visibles : le Remorqueur (masqué) n'apparaît pas", () => {
    expect(slugs(filtrerFlotte(visibles, filtres("type=BATEAU")))).toEqual([
      "seashark2",
      "dinghy4",
      "toro2",
    ]);
  });

  it("par catégorie", () => {
    expect(
      slugs(filtrerFlotte(visibles, filtres("type=BATEAU&categorie=Vedette,Jet-ski"))),
    ).toEqual(["seashark2", "toro2"]);
    expect(filtrerFlotte(visibles, filtres("type=BATEAU&categorie="))).toEqual([]);
  });

  it("places, contenance, prix", () => {
    expect(slugs(filtrerFlotte(visibles, filtres("type=AVION&places=7+")))).toEqual(["luxor"]);
    expect(slugs(filtrerFlotte(visibles, filtres("type=AVION&places=3-6")))).toEqual(["dodo"]);
    expect(slugs(filtrerFlotte(visibles, filtres("type=BATEAU&contenance=-100")))).toEqual([
      "seashark2",
    ]);
    expect(slugs(filtrerFlotte(visibles, filtres("type=BATEAU&contenance=100-500")))).toEqual([
      "dinghy4",
      "toro2",
    ]);
    expect(slugs(filtrerFlotte(tous, filtres("type=BATEAU&contenance=500%2B")))).toEqual([
      "remorqueur",
    ]);
    expect(slugs(filtrerFlotte(visibles, filtres("type=HELICOPTERE&prixMax=2300")))).toEqual([
      "swift",
    ]);
  });

  it("disponible uniquement", () => {
    expect(slugs(filtrerFlotte(visibles, filtres("type=AVION&dispo=1")))).toEqual(["dodo"]);
  });

  it("tris", () => {
    const avions = visibles.filter((v) => v.type === "AVION");
    expect(slugs(trierFlotte(avions, "recommandes"))).toEqual(["dodo", "luxor", "streamer-2026"]);
    expect(slugs(trierFlotte(avions, "prix-croissant"))).toEqual([
      "dodo",
      "streamer-2026",
      "luxor",
    ]);
    expect(slugs(trierFlotte(avions, "prix-decroissant"))).toEqual([
      "luxor",
      "streamer-2026",
      "dodo",
    ]);
    expect(slugs(trierFlotte(avions, "places"))).toEqual(["luxor", "dodo", "streamer-2026"]);
  });
});

describe("catégories et histogramme", () => {
  it("catégories visibles d'un type avec compteurs", () => {
    expect(categoriesDuType(visibles, "BATEAU")).toEqual([
      { nom: "Jet-ski", ordre: 0, nombre: 1 },
      { nom: "Semi-rigide", ordre: 1, nombre: 1 },
      { nom: "Vedette", ordre: 2, nombre: 1 },
    ]);
    expect(categoriesDuType(visibles, "HELICOPTERE")).toEqual([
      { nom: "Affaires", ordre: 0, nombre: 2 },
    ]);
  });

  it("histogramme", () => {
    const h = histogrammePrix([150, 300, 600, 600], 3);
    expect(h.min).toBe(150);
    expect(h.max).toBe(600);
    expect(h.barres.map((b) => b.haut)).toEqual([0.5, 0.5, 1]);
    expect(h.barres.at(-1)?.jusqua).toBe(600);
    expect(histogrammePrix([]).barres).toEqual([]);
    expect(histogrammePrix([500, 500], 2).barres.map((b) => b.haut)).toEqual([1, 0]);
    const lisse = histogrammePrix([150, 4500], 15, 1.5).barres.map((b) => b.haut);
    expect(lisse[0]).toBe(1);
    expect(lisse[1]).toBeGreaterThan(0.3);
    expect(lisse[7]).toBeLessThan(0.01);
  });
});

describe("sélections (maquettes 01 et 03)", () => {
  it("vedette : Luxor ; sélection d'exception : Luxor, Toro2, SuperVolito Carbon", () => {
    expect(vehiculeVedette(visibles)?.slug).toBe("luxor");
    expect(slugs(selectionException(visibles))).toEqual(["luxor", "toro2", "supervolito-carbon"]);
    expect(vehiculeVedette([])).toBeNull();
    expect(selectionException([])).toEqual([]);
  });

  it("véhicules similaires au Luxor : Dodo, Streamer, SuperVolito Carbon", () => {
    const luxor = visibles.find((v) => v.slug === "luxor")!;
    expect(slugs(vehiculesSimilaires(luxor, visibles))).toEqual([
      "streamer-2026",
      "dodo",
      "supervolito-carbon",
    ]);
  });
});
