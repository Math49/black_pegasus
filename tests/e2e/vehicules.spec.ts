import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { connexion, sql } from "./outils";

const NOM = "Velum Essai";
const PHOTO = readFileSync("public/images/vehicule-placeholder.jpg");

async function nettoyer() {
  const ids = await sql<{ id: string }>(`SELECT id FROM "Vehicule" WHERE nom = $1`, [NOM]);
  for (const { id } of ids) {
    await sql(`DELETE FROM "Exemplaire" WHERE "vehiculeId" = $1`, [id]);
    await sql(`DELETE FROM "Vehicule" WHERE id = $1`, [id]);
  }
}

test.describe("véhicules", () => {
  test.beforeAll(nettoyer);
  test.afterAll(async () => {
    await nettoyer();
    await sql(`UPDATE "Vehicule" SET "visibleSurSite" = true WHERE slug = 'dinghy4'`);
  });

  test("créer un véhicule avec photo : il apparaît sur le site, puis suppression (admin)", async ({
    page,
  }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/vehicules");
    await page.getByRole("link", { name: "Ajouter un véhicule" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Nouveau véhicule" })).toBeVisible();

    await page.getByLabel("Nom du véhicule").fill(NOM);
    await page
      .locator("label.bp-sg")
      .filter({ hasText: /^Avion$/ })
      .click();
    await expect(page.getByRole("radio", { name: "Avion" })).toBeChecked();
    await page.getByLabel("Catégorie").selectOption({ label: "Sport" });
    await page.getByLabel("Places").fill("2");
    await page.getByLabel("Contenance").fill("40");
    await page.getByLabel("Prix à l’heure").fill("1300");
    await page.getByLabel("Prix à la journée").fill("7800");
    await page.getByLabel("Caution").fill("6000");
    await expect(page.getByText("à partir de 7 heures")).toBeVisible();
    await page.getByLabel("Immatriculation de l’exemplaire 1").fill("bp ve 01");
    await page
      .locator('input[type="file"]')
      .setInputFiles({ name: "velum.jpg", mimeType: "image/jpeg", buffer: PHOTO });
    await page.getByRole("button", { name: "Enregistrer" }).click();

    await expect(page).toHaveURL(/\/admin\/vehicules$/);
    await expect(page.getByRole("row").filter({ hasText: NOM })).toContainText("BP VE 01");

    await page.goto("/flotte?type=AVION");
    await expect(page.getByRole("heading", { level: 2, name: NOM })).toBeVisible();
    const [{ photo }] = await sql<{ photo: string }>(
      `SELECT photo FROM "Vehicule" WHERE nom = $1`,
      [NOM],
    );
    expect(photo).toMatch(/^photos\/[0-9a-f-]{36}\.jpg$/);
    expect((await page.request.get(`/api/fichiers/${photo}`)).status()).toBe(200);

    await page.goto("/admin/vehicules");
    await page.getByRole("link", { name: `Modifier ${NOM}` }).click();
    await page.getByRole("button", { name: "Supprimer le véhicule" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Supprimer le véhicule" }).click();
    await expect(page).toHaveURL(/\/admin\/vehicules$/);
    await expect(page.getByRole("row").filter({ hasText: NOM })).toHaveCount(0);
    await page.goto("/flotte?type=AVION");
    await expect(page.getByRole("heading", { level: 2, name: NOM })).toHaveCount(0);
  });

  test("un fichier qui n'est pas une image est refusé, même nommé .png", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/vehicules");
    await page.getByRole("link", { name: "Modifier Toro2" }).click();
    await page.locator('input[type="file"]').setInputFiles({
      name: "photo.png",
      mimeType: "image/png",
      buffer: Buffer.from("%PDF-1.7 pas une image"),
    });
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Format refusé" })).toContainText(
      "Format refusé : PNG, JPG ou WEBP uniquement.",
    );
  });

  test("un exemplaire loué ne peut pas être supprimé ; un gestionnaire ne supprime pas de véhicule", async ({
    page,
  }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/vehicules");
    await page.getByRole("link", { name: "Modifier Seashark2" }).click();
    await expect(
      page.getByRole("button", { name: "BP SH 01 a déjà été loué : suppression impossible" }),
    ).toBeDisabled();
    await expect(page.getByLabel("Statut de l’exemplaire 1")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Supprimer l’exemplaire BP SH 04" }),
    ).toBeEnabled();
    await expect(page.getByRole("button", { name: "Supprimer le véhicule" })).toHaveCount(0);
  });

  test("masquer un véhicule le retire du site public", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/vehicules");
    await page.getByRole("switch", { name: "Afficher Dinghy4 sur le site" }).click();
    await expect(
      page.getByRole("switch", { name: "Afficher Dinghy4 sur le site" }),
    ).toHaveAttribute("aria-checked", "false");
    await page.goto("/flotte?type=BATEAU");
    await expect(page.getByRole("heading", { level: 2, name: "Dinghy4" })).toHaveCount(0);
  });
});

test("liste et formulaire des véhicules : aucune violation axe", async ({ page }) => {
  const AxeBuilder = (await import("@axe-core/playwright")).default;
  await connexion(page, "Vincent Moretti");
  for (const chemin of ["/admin/vehicules", "/admin/vehicules/nouveau"]) {
    await page.goto(chemin);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
      [],
    );
  }
});
