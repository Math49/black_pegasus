"use server";

import { z } from "zod";
import { exigerRole } from "@/lib/garde";
import { executer } from "@/lib/resultat";
import {
  enregistrerDomaine,
  supprimerDomaine,
  enregistrerPermis,
  supprimerPermis,
  traiterDemande,
} from "@/services/formation";

const idSchema = z.string().trim().min(1, "Identifiant manquant.").max(100);
const nom = z
  .string()
  .trim()
  .min(2, "Nom : 2 caractères minimum.")
  .max(100, "Nom : 100 caractères maximum.");
const ordre = z.number().int().min(0, "Ordre : minimum 0.").max(1000, "Ordre : maximum 1000.");
const texte = (max: number) => z.string().trim().max(max, `Texte : ${max} caractères maximum.`);
const schemaPermis = z.object({
  domaineId: idSchema,
  nom,
  description: texte(6000).min(2, "Description : 2 caractères minimum."),
  prerequis: texte(1500),
  duree: texte(200),
  epreuves: texte(2000),
  prix: z
    .number()
    .int("Le tarif doit être un nombre entier de dollars.")
    .min(0, "Tarif : minimum 0.")
    .max(10_000_000, "Tarif : maximum 10 000 000 $."),
  ordre,
  visible: z.boolean(),
});

export async function actionEnregistrerDomaine(id: unknown, donnees: unknown) {
  return executer(async () => {
    const acteur = await exigerRole("formation.gerer");
    return enregistrerDomaine(
      acteur,
      idSchema.nullable().parse(id),
      z.object({ nom, ordre }).parse(donnees),
    );
  });
}
export async function actionSupprimerDomaine(id: unknown) {
  return executer(async () =>
    supprimerDomaine(await exigerRole("formation.gerer"), idSchema.parse(id)),
  );
}
export async function actionEnregistrerPermis(id: unknown, donnees: unknown) {
  return executer(async () => {
    const acteur = await exigerRole("formation.gerer");
    return enregistrerPermis(acteur, idSchema.nullable().parse(id), schemaPermis.parse(donnees));
  });
}
export async function actionSupprimerPermis(id: unknown) {
  return executer(async () =>
    supprimerPermis(await exigerRole("formation.gerer"), idSchema.parse(id)),
  );
}
export async function actionTraiterDemande(id: unknown) {
  return executer(async () =>
    traiterDemande(await exigerRole("demande.consulter"), idSchema.parse(id)),
  );
}
