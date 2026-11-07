"use server";

import { z } from "zod";
import { depuisHeureServeur } from "@/domaine/dates";
import { exigerRole } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { executer } from "@/lib/resultat";
import { annulerContrat, cloturerContrat, creerContrat } from "@/services/contrats";

// Aucun montant n'est accepté du navigateur : le serveur recalcule tout (CONCEPTION § 6.1).

const dateServeur = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Date et heure attendues.");
const fuseau = async () =>
  (await prisma.parametres.findUniqueOrThrow({ where: { id: 1 }, select: { fuseauServeur: true } }))
    .fuseauServeur;

const schemaCreation = z.object({
  clientNom: z
    .string()
    .trim()
    .min(2, "Nom du client : 2 caractères minimum.")
    .max(80, "Nom du client trop long."),
  clientTelephone: z
    .string()
    .trim()
    .regex(/^[0-9][0-9 .-]{2,14}$/, "Téléphone en jeu invalide (ex. 555-0148)."),
  /** Licence délivrée par l'État (facultative). */
  numeroLicence: z.string().trim().max(40, "N° de licence trop long.").default(""),
  exemplaireId: z.string().min(1, "Choisissez un exemplaire disponible."),
  debut: dateServeur,
  fin: dateServeur,
});

export async function actionCreerContrat(entree: z.input<typeof schemaCreation>) {
  return executer(async () => {
    const acteur = await exigerRole("contrat.creer");
    const d = schemaCreation.parse(entree);
    const fz = await fuseau();
    const contrat = await creerContrat(acteur, {
      clientNom: d.clientNom,
      clientTelephone: d.clientTelephone,
      numeroLicence: d.numeroLicence || null,
      exemplaireId: d.exemplaireId,
      debut: depuisHeureServeur(d.debut, fz),
      finPrevue: depuisHeureServeur(d.fin, fz),
    });
    return { id: contrat.id, numero: contrat.numero };
  });
}

const schemaCloture = z.object({
  retourReel: dateServeur,
  forfaits: z.array(z.string()).max(20),
  note: z.string().max(500, "Note trop longue.").default(""),
  maintenance: z.boolean().default(false),
});

export async function actionCloturerContrat(
  contratId: string,
  entree: z.input<typeof schemaCloture>,
) {
  return executer(async () => {
    const acteur = await exigerRole("contrat.cloturer");
    const d = schemaCloture.parse(entree);
    const r = await cloturerContrat(acteur, z.string().min(1).parse(contratId), {
      ...d,
      retourReel: depuisHeureServeur(d.retourReel, await fuseau()),
    });
    return { numero: r.numero };
  });
}

export async function actionAnnulerContrat(contratId: string) {
  return executer(async () => {
    const acteur = await exigerRole("contrat.annuler");
    return annulerContrat(acteur, z.string().min(1).parse(contratId));
  });
}
