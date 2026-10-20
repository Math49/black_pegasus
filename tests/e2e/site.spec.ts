import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import "dotenv/config";
import { Client } from "pg";

// Parcours du site public sur les données du seed de démonstration.

async function sql<T>(requete: string, valeurs: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(requete, valeurs)).rows as T[];
  } finally {
    await client.end();
  }
}

const PAGES = [
  { chemin: "/", titre: /Le ciel et l’océan/ },
  { chemin: "/flotte", titre: /Choisissez votre appareil/ },
  { chemin: "/flotte/luxor", titre: "Luxor" },
  { chemin: "/reglement", titre: /Règlement des locations/ },
];

for (const { chemin, titre } of PAGES) {
  test(`${chemin} : s'affiche, téléphone et horaires présents, aucune violation axe`, async ({
    page,
  }) => {
    await page.goto(chemin);
    await expect(page.getByRole("heading", { level: 1, name: titre })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toContainText("555-XXXX");
    await expect(page.getByRole("contentinfo")).toContainText("Tous les jours · 14h – 02h");
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual(
      [],
    );
  });
}

test("le Remorqueur (non visible) n'apparaît nulle part", async ({ page }) => {
  for (const chemin of ["/", "/flotte?type=BATEAU", "/flotte?type=BATEAU&dispo=1"]) {
    await page.goto(chemin);
    await expect(page.getByText("Remorqueur", { exact: true })).toHaveCount(0);
  }
  // La fiche est rendue en streaming : Next sert alors la page introuvable avec « noindex ».
  await page.goto("/flotte/remorqueur");
  await expect(
    page.getByRole("heading", { name: "Ce véhicule n’est pas dans la flotte" }),
  ).toBeVisible();
  expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0);
  const reponse = await page.goto("/adresse-inconnue");
  expect(reponse?.status()).toBe(404);
});

test("filtres de la flotte dans l'URL", async ({ page }) => {
  await page.goto("/flotte");
  await expect(page.getByText(/3\s+modèles · Bateaux/)).toBeVisible();

  await page
    .getByRole("link", { name: /Avions/ })
    .first()
    .click();
  await expect(page).toHaveURL(/type=AVION/);
  await expect(page.getByRole("heading", { level: 2, name: "Luxor" })).toBeVisible();

  await page.getByRole("switch", { name: "Disponible uniquement" }).click();
  await expect(page).toHaveURL(/dispo=1/);
  await expect(page.getByRole("heading", { level: 2, name: "Dodo" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Luxor" })).toHaveCount(0);

  await page.getByRole("button", { name: "7 +" }).click();
  await expect(page).toHaveURL(/places=7%2B/);
  await expect(page.getByRole("heading", { name: "Aucun appareil ne correspond" })).toBeVisible();

  await page.getByRole("link", { name: "Effacer" }).click();
  await expect(page).toHaveURL(/\/flotte\?type=AVION$/);
  await expect(page.getByText(/3\s+modèles · Avions/)).toBeVisible();

  await page.getByLabel("Trier par").selectOption("prix-decroissant");
  await expect(page).toHaveURL(/tri=prix-decroissant/);
  await expect(
    page
      .getByRole("heading", { level: 2 })
      .filter({ hasText: /^(Luxor|Dodo|Streamer216)$/ })
      .first(),
  ).toHaveText("Luxor");
});

test("un exemplaire passé « Loué » change le badge sans redéploiement", async ({ page }) => {
  const [avant] = await sql<{ statut: string }>(
    `SELECT statut FROM "Exemplaire" WHERE immatriculation = 'BP DG 01'`,
  );
  try {
    await sql(`UPDATE "Exemplaire" SET statut = 'DISPONIBLE' WHERE immatriculation = 'BP DG 01'`);
    await page.goto("/flotte/dinghy4");
    await expect(
      page.getByRole("complementary", { name: "Tarifs" }).getByText("Disponible"),
    ).toBeVisible();

    await sql(`UPDATE "Exemplaire" SET statut = 'LOUE' WHERE immatriculation = 'BP DG 01'`);
    await page.reload();
    const tarifs = page.getByRole("complementary", { name: "Tarifs" });
    await expect(tarifs.getByText("Complet")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "Dinghy4" })).toBeVisible();
    await expect(page.getByText("Exemplaire disponible").locator("..")).toContainText("0 / 1");
  } finally {
    await sql(`UPDATE "Exemplaire" SET statut = $1 WHERE immatriculation = 'BP DG 01'`, [
      avant.statut,
    ]);
  }
});

test("le bouton d'appel copie le numéro en jeu", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/flotte/luxor");
  await page.getByRole("button", { name: "Appeler le 555-XXXX" }).first().click();
  await expect(page.getByText("Numéro copié").first()).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("555-XXXX");
});

test.describe("mobile (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("menu repliable et aucun défilement horizontal", async ({ page }) => {
    for (const chemin of ["/", "/flotte", "/flotte/luxor", "/reglement"]) {
      await page.goto(chemin);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
    }
    await page.goto("/");
    const navigation = page.getByRole("navigation", { name: "Navigation principale" });
    await expect(navigation).toBeHidden();
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await expect(navigation).toBeVisible();
    await navigation.getByRole("link", { name: "Règlement" }).click();
    await expect(page).toHaveURL(/\/reglement$/);
  });

  test("filtres de la flotte dans un tiroir", async ({ page }) => {
    await page.goto("/flotte");
    const filtres = page.getByRole("complementary", { name: "Filtres" });
    await expect(filtres).toBeHidden();
    await page.getByRole("button", { name: /^Filtres/ }).click();
    await expect(filtres).toBeVisible();
  });
});
