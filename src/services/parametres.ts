import "server-only";
import { revalidatePath } from "next/cache";
import {
  deplacer,
  estFuseauValide,
  forfaitsCites,
  majorationDepuisPourcent,
  verifierForfaits,
  verifierSuppressionCategorie,
} from "@/domaine/parametres";
import { ErreurMetier, type ForfaitDegats, type TypeVehicule } from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";
import type { Reglement, TextesSite } from "./site";

// Paramètres du site (CONCEPTION § 9.1). Chaque enregistrement est journalisé et revalide
// le site public, dont les pages lisent Parametres à chaque requête.

export async function lireParametresAdmin() {
  const [p, categories] = await Promise.all([
    prisma.parametres.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.categorie.findMany({
      orderBy: [{ type: "asc" }, { ordre: "asc" }, { nom: "asc" }],
      include: { _count: { select: { vehicules: true } } },
    }),
  ]);
  return { p, categories };
}

async function ecrire(
  acteur: CompteConnecte,
  action: string,
  travail: (tx: Tx) => Promise<Record<string, unknown> | void>,
) {
  await enTransaction(async (tx) => {
    const details = (await travail(tx)) ?? {};
    await journaliser(tx, {
      compteId: acteur.id,
      action,
      cible: "Paramètres",
      details: JSON.parse(JSON.stringify(details)),
    });
  });
  revalidatePath("/", "layout");
}

/** Textes où un forfait peut être cité : règlement et textes du site. */
const textesCitant = (reglement: Reglement, textes: TextesSite) => [
  reglement.introduction,
  ...reglement.articles.map((a) => a.contenu),
  textes.accroche.texte,
  textes.maison.texte,
  ...textes.maison.points,
  ...textes.etapes.map((e) => e.texte),
];

export function enregistrerAgence(
  acteur: CompteConnecte,
  d: { telephone: string; horaires: string; immatriculation: string; fuseau: string },
) {
  if (!estFuseauValide(d.fuseau))
    throw new ErreurMetier(`Fuseau horaire inconnu : « ${d.fuseau} ».`);
  return ecrire(acteur, "parametres.agence", async (tx) => {
    const avant = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    await tx.parametres.update({
      where: { id: 1 },
      data: {
        telephoneAgence: d.telephone,
        horaires: d.horaires,
        numeroImmatriculationEntreprise: d.immatriculation,
        fuseauServeur: d.fuseau,
      },
    });
    return {
      telephone: d.telephone,
      ...(avant.fuseauServeur !== d.fuseau && {
        fuseau: { avant: avant.fuseauServeur, apres: d.fuseau },
      }),
    };
  });
}

export function enregistrerTextes(acteur: CompteConnecte, textes: TextesSite) {
  return ecrire(acteur, "parametres.textes", async (tx) => {
    const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    verifierCitations(textes, p.reglement as Reglement, p.forfaitsDegats as ForfaitDegats[]);
    await tx.parametres.update({ where: { id: 1 }, data: { textesSite: textes } });
  });
}

export function enregistrerReglement(acteur: CompteConnecte, reglement: Reglement) {
  return ecrire(acteur, "parametres.reglement", async (tx) => {
    const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    verifierCitations(p.textesSite as TextesSite, reglement, p.forfaitsDegats as ForfaitDegats[]);
    await tx.parametres.update({ where: { id: 1 }, data: { reglement } });
    return { articles: reglement.articles.length };
  });
}

/** Un texte ne peut citer qu'un forfait existant. */
function verifierCitations(textes: TextesSite, reglement: Reglement, forfaits: ForfaitDegats[]) {
  const inconnu = forfaitsCites(textesCitant(reglement, textes)).find(
    (c) => !forfaits.some((f) => f.libelle === c),
  );
  if (inconnu) throw new ErreurMetier(`Forfait inconnu dans le texte : « ${inconnu} ».`);
}

export function enregistrerRegles(
  acteur: CompteConnecte,
  d: {
    toleranceRetardMin: number;
    majorationPourcent: number;
    seuilDefautRestitutionHeures: number;
    penalitesSurCaution: boolean;
    forfaits: ForfaitDegats[];
  },
) {
  return ecrire(acteur, "parametres.regles", async (tx) => {
    const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    const forfaits = d.forfaits.map((f) => ({ libelle: f.libelle.trim(), montant: f.montant }));
    verifierForfaits(
      forfaits,
      forfaitsCites(textesCitant(p.reglement as Reglement, p.textesSite as TextesSite)),
    );
    const data = {
      toleranceRetardMin: d.toleranceRetardMin,
      majorationRetard: majorationDepuisPourcent(d.majorationPourcent),
      seuilDefautRestitutionMin: d.seuilDefautRestitutionHeures * 60,
      penalitesSurCaution: d.penalitesSurCaution,
      forfaitsDegats: forfaits,
    };
    await tx.parametres.update({ where: { id: 1 }, data });
    return data;
  });
}

// ── Catégories ─────────────────────────────────────────────────────────────

const nomCategorie = (nom: string) => {
  const t = nom.trim().replace(/\s+/g, " ");
  if (t.length < 2 || t.length > 40) throw new ErreurMetier("Catégorie : 2 à 40 caractères.");
  return t;
};

async function existeDeja(tx: Tx, type: TypeVehicule, nom: string, sauf?: string) {
  const doublon = await tx.categorie.findFirst({
    where: { type, nom: { equals: nom, mode: "insensitive" }, ...(sauf && { id: { not: sauf } }) },
  });
  if (doublon) throw new ErreurMetier(`La catégorie « ${doublon.nom} » existe déjà.`);
}

export function ajouterCategorie(acteur: CompteConnecte, type: TypeVehicule, nom: string) {
  const n = nomCategorie(nom);
  return ecrire(acteur, "parametres.categorie.ajouter", async (tx) => {
    await existeDeja(tx, type, n);
    const dernier = await tx.categorie.aggregate({ where: { type }, _max: { ordre: true } });
    await tx.categorie.create({ data: { type, nom: n, ordre: (dernier._max.ordre ?? -1) + 1 } });
    return { type, nom: n };
  });
}

export function renommerCategorie(acteur: CompteConnecte, id: string, nom: string) {
  const n = nomCategorie(nom);
  return ecrire(acteur, "parametres.categorie.renommer", async (tx) => {
    const c = await tx.categorie.findUnique({ where: { id } });
    if (!c) throw new ErreurMetier("Catégorie introuvable.");
    await existeDeja(tx, c.type, n, id);
    await tx.categorie.update({ where: { id }, data: { nom: n } });
    return { avant: c.nom, apres: n };
  });
}

export function deplacerCategorie(acteur: CompteConnecte, id: string, delta: -1 | 1) {
  return ecrire(acteur, "parametres.categorie.ordre", async (tx) => {
    const c = await tx.categorie.findUnique({ where: { id } });
    if (!c) throw new ErreurMetier("Catégorie introuvable.");
    const soeurs = await tx.categorie.findMany({
      where: { type: c.type },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    });
    const nouvelOrdre = deplacer(
      soeurs,
      soeurs.findIndex((s) => s.id === id),
      delta,
    );
    // Renumérotation continue 0, 1, 2… : les ordres restent sans doublon.
    for (const [ordre, s] of nouvelOrdre.entries())
      if (s.ordre !== ordre) await tx.categorie.update({ where: { id: s.id }, data: { ordre } });
    return { nom: c.nom, type: c.type };
  });
}

export function supprimerCategorie(acteur: CompteConnecte, id: string) {
  return ecrire(acteur, "parametres.categorie.supprimer", async (tx) => {
    const c = await tx.categorie.findUnique({
      where: { id },
      include: { _count: { select: { vehicules: true } } },
    });
    if (!c) throw new ErreurMetier("Catégorie introuvable.");
    verifierSuppressionCategorie(c.nom, c._count.vehicules);
    await tx.categorie.delete({ where: { id } });
    return { nom: c.nom, type: c.type };
  });
}
