"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerRole } from "@/lib/garde";
import { executer } from "@/lib/resultat";
import { ajouterCompte, modifierCompte, verifierIdentifiant } from "@/services/comptes";

// Écritures de la page Comptes : exigerRole → Zod → service en transaction → journal.

const identifiant = z
  .string()
  .trim()
  .regex(/^\d{17,20}$/, "Identifiant Discord invalide (17 à 20 chiffres).");
const role = z.enum(["ADMIN", "GESTIONNAIRE", "FISC"], { message: "Rôle invalide." });
const nomRp = z.string().max(80, "Nom RP trop long.");

export async function actionVerifierIdentifiant(discordId: string) {
  return executer(async () => {
    await exigerRole("compte.gerer");
    return verifierIdentifiant(z.string().parse(discordId));
  });
}

export async function actionAjouterCompte(entree: {
  discordId: string;
  role: string;
  nomRp?: string;
}) {
  return executer(async () => {
    const acteur = await exigerRole("compte.gerer");
    const donnees = z
      .object({ discordId: identifiant, role, nomRp: nomRp.default("") })
      .parse(entree);
    await ajouterCompte(acteur, donnees.discordId, donnees.role, donnees.nomRp);
    revalidatePath("/admin/comptes");
  });
}

export async function actionModifierCompte(entree: {
  compteId: string;
  role?: string;
  actif?: boolean;
  nomRp?: string;
}) {
  return executer(async () => {
    const acteur = await exigerRole("compte.gerer");
    const donnees = z
      .object({
        compteId: z.string().min(1),
        role: role.optional(),
        actif: z.boolean().optional(),
        nomRp: nomRp.optional(),
      })
      .parse(entree);
    await modifierCompte(acteur, donnees.compteId, {
      role: donnees.role,
      actif: donnees.actif,
      nomRp: donnees.nomRp,
    });
    revalidatePath("/admin/comptes");
  });
}
