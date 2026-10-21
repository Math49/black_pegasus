"use server";

import { z } from "zod";
import { exigerRole } from "@/lib/garde";
import { executer } from "@/lib/resultat";
import {
  ajouterCategorie,
  deplacerCategorie,
  enregistrerAgence,
  enregistrerReglement,
  enregistrerRegles,
  enregistrerTextes,
  renommerCategorie,
  supprimerCategorie,
} from "@/services/parametres";

// Paramètres du site, administrateur uniquement : exigerRole → Zod → service → journal.

const texte = (libelle: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min, `${libelle} : ${min} caractère${min > 1 ? "s" : ""} minimum.`)
    .max(max, `${libelle} : ${max} caractères maximum.`);
const entier = (libelle: string, min: number, max: number) =>
  z
    .number({ message: `${libelle} : nombre attendu.` })
    .int(`${libelle} : nombre entier attendu.`)
    .min(min, `${libelle} : minimum ${min}.`)
    .max(max, `${libelle} : maximum ${max}.`);
const bloc = z.object({ titre: texte("Titre", 2, 120), texte: texte("Texte", 2, 1200) });

const schemas = {
  agence: z.object({
    telephone: texte("Téléphone", 3, 20),
    horaires: texte("Horaires", 3, 80),
    immatriculation: texte("N° d’immatriculation", 1, 40),
    fuseau: texte("Fuseau", 3, 60),
  }),
  textes: z.object({
    accroche: bloc,
    maison: bloc.extend({ points: z.array(texte("Point", 2, 160)).max(8, "8 points maximum.") }),
    etapes: z.array(bloc).length(3, "Trois étapes attendues."),
  }),
  reglement: z.object({
    dateMiseAJour: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date de mise à jour invalide.")
      .nullable(),
    introduction: z.string().trim().max(1500, "Introduction trop longue."),
    articles: z
      .array(
        z.object({ titre: texte("Titre d’article", 2, 120), contenu: texte("Article", 2, 6000) }),
      )
      .min(1, "Au moins un article."),
  }),
  regles: z.object({
    toleranceRetardMin: entier("Tolérance", 0, 240),
    majorationPourcent: entier("Majoration", 0, 500),
    seuilDefautRestitutionHeures: entier("Seuil de défaut de restitution", 1, 72),
    penalitesSurCaution: z.boolean(),
    forfaits: z
      .array(
        z.object({ libelle: z.string(), montant: entier("Montant du forfait", 0, 10_000_000) }),
      )
      .max(20, "20 forfaits maximum."),
  }),
};

export async function actionEnregistrerAgence(d: unknown) {
  return executer(async () =>
    enregistrerAgence(await exigerRole("parametres.gerer"), schemas.agence.parse(d)),
  );
}
export async function actionEnregistrerTextes(d: unknown) {
  return executer(async () =>
    enregistrerTextes(await exigerRole("parametres.gerer"), schemas.textes.parse(d)),
  );
}
export async function actionEnregistrerReglement(d: unknown) {
  return executer(async () =>
    enregistrerReglement(await exigerRole("parametres.gerer"), schemas.reglement.parse(d)),
  );
}
export async function actionEnregistrerRegles(d: unknown) {
  return executer(async () =>
    enregistrerRegles(await exigerRole("parametres.gerer"), schemas.regles.parse(d)),
  );
}

const type = z.enum(["BATEAU", "AVION", "HELICOPTERE"], { message: "Type invalide." });
const id = z.string().min(1);

export async function actionAjouterCategorie(t: string, nom: string) {
  return executer(async () =>
    ajouterCategorie(await exigerRole("parametres.gerer"), type.parse(t), z.string().parse(nom)),
  );
}
export async function actionRenommerCategorie(c: string, nom: string) {
  return executer(async () =>
    renommerCategorie(await exigerRole("parametres.gerer"), id.parse(c), z.string().parse(nom)),
  );
}
export async function actionDeplacerCategorie(c: string, delta: number) {
  return executer(async () =>
    deplacerCategorie(
      await exigerRole("parametres.gerer"),
      id.parse(c),
      z.union([z.literal(-1), z.literal(1)]).parse(delta),
    ),
  );
}
export async function actionSupprimerCategorie(c: string) {
  return executer(async () =>
    supprimerCategorie(await exigerRole("parametres.gerer"), id.parse(c)),
  );
}
