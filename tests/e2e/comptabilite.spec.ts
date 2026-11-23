import { createHash } from "node:crypto";
import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connexion, sql } from "./outils";

const NBSP = " ";

async function restaurer() {
  // Remet la semaine 43 ouverte, comme après le seed.
  await sql(`DELETE FROM "Mouvement" WHERE "semaineId" = '2026-S44'`);
  await sql(`DELETE FROM "Semaine" WHERE id = '2026-S44'`);
  await sql(
    `UPDATE "Semaine" SET statut = 'OUVERTE', "soldeCloture" = NULL, "clotureeLe" = NULL, "clotureeParId" = NULL,
     "declarationPdf" = NULL, "declarationSha256" = NULL WHERE id = '2026-S43'`,
  );
  await sql(`DELETE FROM "JournalAudit" WHERE action = 'semaine.cloturer'`);
  await sql(`UPDATE "Parametres" SET "ouvertureClotureHeuresAvantFin" = 24 WHERE id = 1`);
}

test.describe("comptabilité hebdomadaire", () => {
  test.beforeAll(restaurer);
  test.afterAll(restaurer);

  test("synthèse, contrôles et registre de la semaine 43", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/comptabilite");
    const synthese = page.getByRole("region", { name: "Synthèse de la semaine" });
    for (const t of ["$412", "$91", "$24", "$18", "$35", "$514"])
      await expect(synthese).toContainText(t);
    // Impôt dû : 20 % des $91 400 de recettes (REFONTE-ADMIN § 2).
    await expect(synthese).toContainText(`$18${NBSP}280`);
    await expect(page.getByText("5 / 5 dépenses justifiées")).toBeVisible();
    await expect(page.getByText("35 opérations numérotées, sans trou")).toBeVisible();
    await expect(page.getByText(`Solde rapproché : $514${NBSP}630`)).toBeVisible();
    // Un gestionnaire ne clôture pas.
    await expect(page.getByRole("button", { name: "Clôturer la semaine" })).toHaveCount(0);

    const registre = page.getByRole("table", { name: "Registre des opérations de la semaine 43" });
    await expect(registre.getByRole("row")).toHaveCount(37); // en-tête + 35 + totaux
    await page.getByRole("link", { name: /Dépenses/ }).click();
    await expect(page).toHaveURL(/onglet=depenses/);
    await expect(registre.getByRole("row")).toHaveCount(7);
    await expect(registre).toContainText(`−$24${NBSP}150`);
  });

  test("export CSV et brouillon de déclaration (jamais archivé)", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    const csv = await page.request.get("/admin/comptabilite/2026-S43/csv");
    expect(csv.headers()["content-type"]).toContain("text/csv");
    const lignes = (await csv.text()).trim().split("\r\n");
    expect(lignes).toHaveLength(36);
    expect(lignes[1]).toContain("OP-43-001;2026-10-19 09:15;Impôts");

    const brouillon = await page.request.get("/admin/comptabilite/2026-S43/declaration");
    expect(brouillon.status()).toBe(200);
    expect(brouillon.headers()["content-disposition"]).toContain("DEC-2026-S43-brouillon.pdf");
    const [s] = await sql<{ declarationPdf: string | null }>(
      `SELECT "declarationPdf" FROM "Semaine" WHERE id = '2026-S43'`,
    );
    expect(s.declarationPdf).toBeNull();
  });

  test("clôture : confirmation, verrouillage, semaine 44 et déclaration archivée", async ({
    page,
    browser,
  }) => {
    // Clôture ouverte dès samedi 00:00 : l'horloge de démonstration est samedi 21:40.
    await sql(`UPDATE "Parametres" SET "ouvertureClotureHeuresAvantFin" = 48 WHERE id = 1`);
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/comptabilite");
    await page.getByRole("button", { name: "Clôturer la semaine" }).click();
    const modale = page.getByRole("dialog", { name: "Clôturer la semaine 43 ?" });
    await expect(modale).toContainText("Impôt dû · 20 %");
    await expect(modale).toContainText(`$18${NBSP}280`);
    await expect(modale).toContainText("dont CTR-2026-0039 en retard");
    const valider = modale.getByRole("button", { name: "Clôturer et générer la déclaration" });
    await modale.getByLabel(/Pour confirmer/).fill("CLOTURER S43");
    await expect(valider).toBeDisabled();
    await modale.getByLabel(/Pour confirmer/).fill("clôturer s43");
    await expect(valider).toBeEnabled();
    await valider.click();
    await expect(page.getByText("Registre verrouillé le")).toBeVisible({ timeout: 30_000 });

    const semaines = await sql<{
      id: string;
      statut: string;
      soldeOuverture: number;
      soldeCloture: number | null;
      declarationSha256: string | null;
      tauxImpot: number | null;
    }>(
      `SELECT id, statut, "soldeOuverture", "soldeCloture", "declarationSha256", "tauxImpot" FROM "Semaine" WHERE id IN ('2026-S43', '2026-S44') ORDER BY id`,
    );
    // Le taux d'impôt est figé à la clôture.
    expect(semaines[0]).toMatchObject({ statut: "CLOTUREE", soldeCloture: 514630, tauxImpot: 20 });
    expect(semaines[0].declarationSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(semaines[1]).toMatchObject({ statut: "OUVERTE", soldeOuverture: 514630 });

    // Déclaration servie telle quelle : mêmes octets, empreinte conforme.
    const a = await page.request.get("/admin/comptabilite/2026-S43/declaration");
    const b = await page.request.get("/admin/comptabilite/2026-S43/declaration");
    const octets = await a.body();
    expect(createHash("sha256").update(octets).digest("hex")).toBe(semaines[0].declarationSha256);
    expect(Buffer.compare(octets, await b.body())).toBe(0);
    expect(a.headers()["x-empreinte-sha256"]).toBe(semaines[0].declarationSha256);

    // Semaine clôturée en lecture seule : un mouvement manuel n'est plus modifiable.
    await page.goto("/admin/solde?periode=2026-S43");
    await page.getByRole("button", { name: "Détail de OP-43-027" }).click();
    await expect(page.getByRole("dialog")).toContainText(
      "Semaine clôturée : le registre est en lecture seule.",
    );
    await expect(page.getByRole("dialog").getByLabel("Motif")).toHaveCount(0);

    // Déclaration définitive réservée aux administrateurs.
    const gestion = await browser.newContext();
    const pageGestion = await gestion.newPage();
    await connexion(pageGestion, "Lena Castillo");
    expect(
      (await pageGestion.request.get("/admin/comptabilite/2026-S43/declaration")).status(),
    ).toBe(403);
    await gestion.close();
  });

  test("accessibilité", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/comptabilite");
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
});
