import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connexion, sql } from "./outils";

type Ligne = { telephone: string; reglement: unknown; toleranceRetardMin: number };
let origine: Ligne;

test.describe("paramètres du site", () => {
  test.beforeAll(async () => {
    [origine] = await sql<Ligne>(
      `SELECT f.telephone, p.reglement, p."toleranceRetardMin" FROM "Parametres" p, "Filiale" f WHERE p.id = 1 AND f.code = 'BPL'`,
    );
  });
  test.afterAll(async () => {
    await sql(`UPDATE "Filiale" SET telephone = $1 WHERE code = 'BPL'`, [origine.telephone]);
    await sql(`UPDATE "Parametres" SET reglement = $1, "toleranceRetardMin" = $2 WHERE id = 1`, [
      JSON.stringify(origine.reglement),
      origine.toleranceRetardMin,
    ]);
    await sql(`DELETE FROM "Categorie" WHERE nom = 'Essai e2e'`);
    await sql(`DELETE FROM "JournalAudit" WHERE action LIKE 'parametres.%'`);
  });

  test("le téléphone et un article du règlement changent aussitôt sur le site", async ({
    page,
  }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/parametres?onglet=location");
    const agence = page.getByRole("region", { name: "Filiale · Location" });
    await agence.getByLabel("Téléphone en jeu").fill("555-0199");
    await agence.getByRole("button", { name: "Enregistrer" }).click();
    await expect(agence.getByRole("status")).toContainText("Modifications enregistrées");

    const reglement = page.getByRole("region", { name: "Règlement des locations" });
    await reglement.getByLabel("Article 1 · titre").fill("Conditions générales de location");
    await reglement.getByRole("button", { name: "Enregistrer le règlement" }).click();
    await expect(reglement.getByRole("status")).toContainText("Modifications enregistrées");

    await page.goto("/");
    await expect(page.getByText("555-0199").first()).toBeVisible();
    await page.goto("/location/reglement");
    await expect(
      page.getByRole("heading", { name: /Conditions générales de location/ }),
    ).toBeVisible();
  });

  test("règles : valeur hors bornes refusée, forfait cité protégé", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/parametres?onglet=location");
    const regles = page.getByRole("region", { name: "Règles de location" });
    await regles.getByLabel("Tolérance de retard (min)").fill("999");
    await regles.getByRole("button", { name: "Enregistrer" }).click();
    await expect(regles.getByRole("alert")).toContainText("Tolérance : maximum 240");

    await regles.getByLabel("Tolérance de retard (min)").fill("20");
    await regles
      .getByRole("button", { name: "Supprimer le forfait Rayures ou éraflures légères" })
      .click();
    await regles.getByRole("button", { name: "Enregistrer" }).click();
    await expect(regles.getByRole("alert")).toContainText("cité dans le règlement");
    const [p] = await sql<{ toleranceRetardMin: number }>(
      `SELECT "toleranceRetardMin" FROM "Parametres" WHERE id = 1`,
    );
    expect(p.toleranceRetardMin).toBe(origine.toleranceRetardMin);
  });

  test("catégories : ajout puis suppression ; une catégorie utilisée reste protégée", async ({
    page,
  }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/parametres?onglet=location");
    const categories = page.getByRole("region", { name: "Catégories" });
    await expect(
      categories.getByRole("button", { name: /Jet-ski est utilisée par 1 véhicule/ }),
    ).toBeDisabled();

    await categories.getByLabel("Nouvelle catégorie · bateaux").fill("Essai e2e");
    await categories.getByRole("button", { name: "Ajouter" }).first().click();
    await expect(categories.getByRole("status")).toContainText("« Essai e2e » ajoutée");
    await expect(categories.getByLabel("Nom de la catégorie Essai e2e")).toBeVisible();
    await categories.getByRole("button", { name: "Supprimer Essai e2e" }).click();
    await expect(categories.getByRole("status")).toContainText("supprimée");
    expect(await sql(`SELECT id FROM "Categorie" WHERE nom = 'Essai e2e'`)).toHaveLength(0);
  });

  test("réservé aux administrateurs", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/parametres");
    await expect(page).toHaveURL(/\/admin\/acces-refuse\?raison=role/);
  });

  test("accessibilité des quatre onglets", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    for (const onglet of ["groupe", "location", "formation", "cards"]) {
      await page.goto(`/admin/parametres?onglet=${onglet}`);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${onglet} ${v.id} : ${v.nodes[0]?.target.join(" ")}`)).toEqual(
        [],
      );
    }
  });

  test("onglets : groupe par défaut, une section par filiale", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/parametres");
    const onglets = page.getByRole("navigation", { name: "Paramètres du groupe et des filiales" });
    await expect(onglets.getByRole("link", { name: "Groupe" })).toHaveAttribute(
      "aria-current",
      "true",
    );
    await expect(
      page.getByRole("region", { name: "Accueil du groupe", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Règles de location" })).toHaveCount(0);

    await onglets.getByRole("link", { name: "Location" }).click();
    await expect(page).toHaveURL(/onglet=location/);
    await expect(
      page.getByRole("region", { name: "Filiale · Location", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("region", { name: "Règles de location" })).toBeVisible();

    await onglets.getByRole("link", { name: "Cards" }).click();
    await expect(page.getByRole("region", { name: "Filiale · Cards", exact: true })).toBeVisible();
    await page.getByRole("link", { name: "Gérer les cartes" }).click();
    await expect(page).toHaveURL(/\/admin\/cards$/);
  });
});
