"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigerRole } from "@/lib/garde";
import { executer } from "@/lib/resultat";
import { cloturerSemaine } from "@/services/comptabilite";
import { pdfDeclaration } from "@/services/pdf";

// Clôture d'une semaine (§ 6.6) : exigerRole → Zod → service en transaction → journal, puis
// génération et archivage de la déclaration (hors transaction : impression Playwright).
export async function actionCloturerSemaine(entree: { semaineId: string; confirmation: string }) {
  return executer(async () => {
    const acteur = await exigerRole("semaine.cloturer");
    const d = z
      .object({ semaineId: z.string().regex(/^\d{4}-S\d{2}$/), confirmation: z.string().max(40) })
      .parse(entree);
    const r = await cloturerSemaine(acteur, d.semaineId, d.confirmation);
    try {
      await pdfDeclaration(d.semaineId);
    } catch (e) {
      // La clôture reste acquise : la déclaration sera générée au premier téléchargement.
      console.error("Déclaration non générée", e);
    }
    revalidatePath("/admin", "layout");
    return r;
  });
}
