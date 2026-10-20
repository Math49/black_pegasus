import "server-only";
import { randomBytes } from "node:crypto";
import type { Browser } from "playwright";
import { prisma } from "@/lib/prisma";
import { enregistrerFichier, lireFichier } from "./stockage";

// PDF (CONCEPTION § 8) : Playwright imprime en A4 une page HTML interne (/interne/pdf/…).
// Ces pages ne répondent qu'avec le jeton PDF_TOKEN, transmis en en-tête par ce service.

const globalPdf = globalThis as unknown as { navigateurPdf?: Promise<Browser>; jetonPdf?: string };

/** Jeton des pages internes : PDF_TOKEN, ou un jeton aléatoire propre au processus. */
export function jetonPdf(): string {
  if (process.env.PDF_TOKEN) return process.env.PDF_TOKEN;
  globalPdf.jetonPdf ??= randomBytes(24).toString("hex");
  return globalPdf.jetonPdf;
}

export const EN_TETE_JETON = "x-jeton-pdf";

async function navigateur(): Promise<Browser> {
  if (!globalPdf.navigateurPdf) {
    const { chromium } = await import("playwright");
    globalPdf.navigateurPdf = chromium.launch().catch((e) => {
      globalPdf.navigateurPdf = undefined;
      throw e;
    });
  }
  return globalPdf.navigateurPdf;
}

const adresseInterne = () =>
  process.env.URL_INTERNE ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;

/** Imprime une page interne en PDF A4. */
export async function imprimer(chemin: string): Promise<Buffer> {
  const contexte = await (
    await navigateur()
  ).newContext({ extraHTTPHeaders: { [EN_TETE_JETON]: jetonPdf() } });
  try {
    const page = await contexte.newPage();
    const reponse = await page.goto(`${adresseInterne()}${chemin}`, { waitUntil: "networkidle" });
    if (!reponse?.ok()) throw new Error(`Page PDF indisponible (${reponse?.status()}) : ${chemin}`);
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
  } finally {
    await contexte.close();
  }
}

/** Génère et enregistre le PDF d'un contrat ; renvoie sa clé de stockage. */
export async function genererPdfContrat(contratId: string): Promise<string> {
  const pdf = await imprimer(`/interne/pdf/contrat/${contratId}`);
  const cle = await enregistrerFichier("pdf", new Uint8Array(pdf), "pdf");
  await prisma.contrat.update({ where: { id: contratId }, data: { pdf: cle } });
  return cle;
}

/** PDF d'un contrat : celui enregistré, sinon généré à la demande. */
export async function pdfContrat(contratId: string) {
  const contrat = await prisma.contrat.findUnique({
    where: { id: contratId },
    select: { numero: true, pdf: true },
  });
  if (!contrat) return null;
  const existant = contrat.pdf ? await lireFichier(contrat.pdf) : null;
  if (existant) return { numero: contrat.numero, contenu: existant.contenu };
  const cle = await genererPdfContrat(contratId);
  const fichier = await lireFichier(cle);
  return fichier ? { numero: contrat.numero, contenu: fichier.contenu } : null;
}
