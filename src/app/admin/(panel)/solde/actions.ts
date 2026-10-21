"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { depuisHeureServeur } from "@/domaine/dates";
import { CATEGORIES } from "@/domaine/solde";
import { lireImageEnvoyee } from "@/lib/fichiers";
import { exigerRole } from "@/lib/garde";
import { exigerQuotaEnvoi } from "@/lib/limites";
import { prisma } from "@/lib/prisma";
import { executer } from "@/lib/resultat";
import { contrePasserMouvement, creerMouvement, modifierMouvement } from "@/services/solde";

// Écritures de la page Solde : exigerRole → Zod → service en transaction → journal.

const montant = z
  .string()
  .transform((t) => t.replace(/[\s  $]/g, ""))
  .pipe(z.string().regex(/^\d{1,9}$/, "Montant : nombre entier de dollars."))
  .transform(Number);

const schemaSaisie = z.object({
  sens: z.enum(["ENTREE", "SORTIE"], { message: "Choisissez le sens." }),
  categorie: z.enum(CATEGORIES as [string, ...string[]], { message: "Catégorie invalide." }),
  montant,
  motif: z.string().trim().max(160, "Motif trop long (160 caractères)."),
  date: z.string().min(1, "Indiquez la date et l’heure."),
  contratId: z.string().optional(),
});

const fuseau = async () =>
  (await prisma.parametres.findUniqueOrThrow({ where: { id: 1 }, select: { fuseauServeur: true } }))
    .fuseauServeur;

export async function actionCreerMouvement(formulaire: FormData) {
  return executer(async () => {
    const acteur = await exigerRole("mouvement.creer");
    if (formulaire.get("justificatif")) exigerQuotaEnvoi(acteur.id);
    const d = schemaSaisie.parse(Object.fromEntries(formulaire));
    const image = await lireImageEnvoyee(formulaire.get("justificatif"));
    const resultat = await creerMouvement(
      acteur,
      {
        sens: d.sens,
        categorie: d.categorie as (typeof CATEGORIES)[number],
        montant: d.montant,
        motif: d.motif,
        date: depuisHeureServeur(d.date, await fuseau()),
        contratId: d.contratId || null,
      },
      image,
    );
    revalidatePath("/admin", "layout");
    return resultat;
  });
}

export async function actionModifierMouvement(formulaire: FormData) {
  return executer(async () => {
    const acteur = await exigerRole("mouvement.modifier");
    if (formulaire.get("justificatif")) exigerQuotaEnvoi(acteur.id);
    const d = z
      .object({ id: z.string().min(1), motif: z.string().trim().max(160, "Motif trop long.") })
      .parse({ id: formulaire.get("id"), motif: formulaire.get("motif") });
    await modifierMouvement(
      acteur,
      d.id,
      { motif: d.motif },
      await lireImageEnvoyee(formulaire.get("justificatif")),
    );
    revalidatePath("/admin", "layout");
  });
}

export async function actionContrePasserMouvement(id: string) {
  return executer(async () => {
    const acteur = await exigerRole("mouvement.contrePasser");
    const r = await contrePasserMouvement(acteur, z.string().min(1).parse(id));
    revalidatePath("/admin", "layout");
    return r;
  });
}
