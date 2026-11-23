import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connexion, sql } from "./outils";

// Refonte R-2 : impôt sur les recettes, catégories de mouvements gérées dans les Paramètres.

const NOM = "Essai e2e : frais de réception";

test.afterAll(async () => {
  await sql(`DELETE FROM "CategorieMouvement" WHERE nom LIKE 'Essai e2e%'`);
  await sql(`UPDATE "Parametres" SET "tauxImpot" = 20 WHERE id = 1`);
});

test("comptabilité : impôt dû de 20 % sur les recettes de la semaine ouverte", async ({ page }) => {
  await connexion(page, "Lena Castillo");
  await page.goto("/admin/comptabilite");
  const synthese = page.getByRole("region", { name: "Synthèse de la semaine" });
  await expect(synthese).toContainText("Impôt dû · 20 %");
  await expect(synthese).toContainText("$18 280");
  // Une semaine clôturée avant la refonte garde l'ancienne règle.
  await page.goto("/admin/comptabilite?semaine=2026-S42");
  await expect(page.getByRole("region", { name: "Synthèse de la semaine" })).toContainText(
    "Résultat imposable",
  );
});

test("paramètres : taux d'impôt et catégorie créée, proposée à la saisie puis supprimée", async ({
  page,
}) => {
  await connexion(page, "Vincent Moretti");
  await page.goto("/admin/parametres?onglet=comptabilite");

  const impot = page.locator("#impot");
  await impot.getByLabel("Taux d’impôt (% des recettes)").fill("25");
  await impot.getByRole("button", { name: "Enregistrer" }).click();
  await expect(impot.getByRole("status")).toBeVisible();
  const [p] = await sql<{ tauxImpot: number }>(`SELECT "tauxImpot" FROM "Parametres"`);
  expect(p.tauxImpot).toBe(25);

  const nouvelle = page.getByRole("form", { name: "Nouvelle catégorie de mouvement" });
  await nouvelle.getByLabel("Nom").fill(NOM);
  await nouvelle.getByRole("button", { name: "Créer la catégorie" }).click();
  await expect(page.getByRole("form", { name: `Catégorie ${NOM}` })).toBeVisible();
  const [c] = await sql<{ sens: string; justificatifObligatoire: boolean }>(
    `SELECT sens, "justificatifObligatoire" FROM "CategorieMouvement" WHERE nom = $1`,
    [NOM],
  );
  expect(c).toEqual({ sens: "SORTIE", justificatifObligatoire: true });

  // Une catégorie système ne se supprime pas.
  await expect(page.getByRole("button", { name: "Supprimer Location" })).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations).toEqual([]);

  await page.goto("/admin/solde?nouveau=1");
  const modale = page.getByRole("dialog", { name: "Nouveau mouvement" });
  await expect(modale.getByLabel("Catégorie").locator("option", { hasText: NOM })).toHaveCount(1);
  await modale.getByText("Entrée", { exact: true }).click();
  await expect(modale.getByLabel("Catégorie").locator("option", { hasText: NOM })).toHaveCount(0);

  await page.goto("/admin/parametres?onglet=comptabilite");
  await page.getByRole("button", { name: `Supprimer ${NOM}` }).click();
  await expect(page.getByRole("form", { name: `Catégorie ${NOM}` })).toHaveCount(0);
});
