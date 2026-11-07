"use server";

import { z } from "zod";
import { schemaDemandeFormation } from "@/domaine/formation";
import { exigerQuotaDemandeFormation } from "@/lib/limites";
import { executer } from "@/lib/resultat";
import { recevoirDemande } from "@/services/formation";

/** Exception publique prévue en F-3 : aucune session exigée pour prendre contact. */
export async function actionDemanderFormation(formulaire: FormData) {
  return executer(async () => {
    await exigerQuotaDemandeFormation();
    const piege = z
      .string()
      .max(200)
      .parse(formulaire.get("siteWeb") ?? "");
    if (piege.trim()) return;
    const permisId = formulaire.get("permisId");
    return recevoirDemande(
      schemaDemandeFormation.parse({
        nomRp: formulaire.get("nomRp"),
        telephone: formulaire.get("telephone"),
        message: formulaire.get("message"),
        permisId: permisId === "" || permisId === null ? null : permisId,
      }),
    );
  });
}
