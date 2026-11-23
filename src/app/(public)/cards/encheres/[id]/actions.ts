"use server";

import { z } from "zod";
import { schemaOffre } from "@/domaine/encheres";
import { exigerQuotaOffreEnchere } from "@/lib/limites";
import { executer } from "@/lib/resultat";
import { deposerOffre } from "@/services/encheres";

/** Offre publique (sans session, comme une demande de formation) : quota par adresse et piège. */
export async function actionEncherir(enchereId: string, formulaire: FormData) {
  return executer(async () => {
    const id = z.string().min(1).max(100).parse(enchereId);
    await exigerQuotaOffreEnchere(id);
    const piege = z
      .string()
      .max(200)
      .parse(formulaire.get("siteWeb") ?? "");
    if (piege.trim()) return;
    const offre = schemaOffre.parse({
      nom: formulaire.get("nom"),
      telephone: formulaire.get("telephone"),
      montant: formulaire.get("montant"),
    });
    await deposerOffre(id, offre);
  });
}
