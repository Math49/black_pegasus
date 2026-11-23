"use server";

import { z } from "zod";
import { exigerRole } from "@/lib/garde";
import { executer } from "@/lib/resultat";
import {
  annulerEnchere,
  conclureEnchere,
  ecarterOffre,
  relancerEnchere,
} from "@/services/encheres";

// Décisions du panel sur une enchère : exigerRole → Zod → service en transaction → journal.

const id = z.string().trim().min(1, "Identifiant manquant.").max(100);

export async function actionConclureEnchere(cible: unknown) {
  return executer(async () => {
    const v = await conclureEnchere(await exigerRole("enchere.gerer"), id.parse(cible));
    return { numero: v.numero };
  });
}

/** Le gagnant ne paie pas : son offre est écartée, la suivante devient gagnante. */
export async function actionEncherisseurSuivant(offre: unknown) {
  return executer(async () =>
    ecarterOffre(await exigerRole("enchere.gerer"), id.parse(offre), "defaillant"),
  );
}

export async function actionEcarterOffre(offre: unknown) {
  return executer(async () =>
    ecarterOffre(await exigerRole("enchere.ecarter"), id.parse(offre), "fantaisiste"),
  );
}

export async function actionAnnulerEnchere(cible: unknown) {
  return executer(async () => annulerEnchere(await exigerRole("enchere.gerer"), id.parse(cible)));
}

export async function actionRelancerEnchere(cible: unknown) {
  return executer(async () => relancerEnchere(await exigerRole("enchere.gerer"), id.parse(cible)));
}
