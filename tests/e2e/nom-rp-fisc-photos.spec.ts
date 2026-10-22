import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connexion, sql } from "./outils";

const NOUVEAU = "730000000000000042";
const PHOTO = "public/images/vehicule-placeholder.jpg";

test.describe("nom RP des comptes", () => {
  test.afterAll(async () => {
    await sql(`UPDATE "Compte" SET "nomRp" = 'Lena Castillo' WHERE pseudo = 'lena.cstl'`);
    await sql(`DELETE FROM "Compte" WHERE "discordId" = $1`, [NOUVEAU]);
    await sql(`DELETE FROM "JournalAudit" WHERE action IN ('compte.nom', 'compte.ajouter')`);
  });

  test("modifier le nom RP : il remplace le nom partout (registre « Saisi par »)", async ({
    page,
  }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/comptes");
    await page.getByRole("button", { name: "Plus d’actions pour Lena Castillo" }).click();
    await page.getByRole("menuitem", { name: "Modifier le nom RP" }).click();
    const modale = page.getByRole("dialog", { name: "Nom RP" });
    await modale.getByLabel("Nom du personnage").fill("Lena  « Lady »  Castillo");
    await modale.getByRole("button", { name: "Enregistrer" }).click();
    await expect(modale).toBeHidden();
    const [c] = await sql<{ nomRp: string }>(
      `SELECT "nomRp" FROM "Compte" WHERE pseudo = 'lena.cstl'`,
    );
    expect(c.nomRp).toBe("Lena « Lady » Castillo");

    await page.goto("/admin/solde");
    await expect(
      page
        .getByRole("table", { name: "Historique des mouvements" })
        .getByText("Lena « Lady » Castillo")
        .first(),
    ).toBeVisible();
  });

  test("ajouter un compte FISC avec son nom RP", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/comptes");
    await page.getByRole("button", { name: "Ajouter un compte" }).click();
    const modale = page.getByRole("dialog", { name: "Ajouter un compte" });
    await modale.getByLabel("Identifiant Discord").fill(NOUVEAU);
    await modale.getByLabel("Nom RP").fill("Inspectrice Claire Vidal");
    await modale.locator("label.bp-choix").filter({ hasText: /^FISC/ }).click();
    await modale.getByRole("button", { name: "Ajouter le compte" }).click();
    await expect(modale).toBeHidden();
    const [c] = await sql<{ nomRp: string; role: string }>(
      `SELECT "nomRp", role FROM "Compte" WHERE "discordId" = $1`,
      [NOUVEAU],
    );
    expect(c).toEqual({ nomRp: "Inspectrice Claire Vidal", role: "FISC" });
    await expect(
      page.getByRole("table", { name: "Comptes autorisés" }).getByText("Inspectrice Claire Vidal"),
    ).toBeVisible();
  });
});

test.describe("rôle FISC (consultation seule)", () => {
  test("arrive sur la comptabilité ; ne voit que contrats, solde et comptabilité", async ({
    page,
  }) => {
    await page.goto("/admin/connexion");
    await page.getByRole("button", { name: /^Inspecteur Daniel Hart/ }).click();
    await expect(page).toHaveURL(/\/admin\/comptabilite$/);
    const nav = page
      .getByRole("navigation", { name: "Navigation du panel" })
      .or(page.getByRole("complementary", { name: "Navigation du panel" }));
    for (const lien of ["Solde", "Contrats", "Comptabilité"])
      await expect(nav.getByRole("link", { name: new RegExp(`^${lien}`) })).toBeVisible();
    for (const lien of ["Tableau de bord", "Véhicules", "Comptes", "Paramètres"])
      await expect(nav.getByRole("link", { name: new RegExp(`^${lien}`) })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Clôturer la semaine" })).toHaveCount(0);

    await page.goto("/admin/contrats");
    await expect(page.getByRole("table", { name: "Contrats en cours" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Nouveau contrat" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Clôturer" })).toHaveCount(0);
    const [{ id }] = await sql<{ id: string }>(`SELECT id FROM "Contrat" LIMIT 1`);
    expect((await page.request.get(`/admin/contrats/${id}/pdf`)).headers()["content-type"]).toBe(
      "application/pdf",
    );

    await page.goto("/admin/solde");
    await expect(page.getByRole("button", { name: "Nouveau mouvement" })).toHaveCount(0);
    await page.getByRole("button", { name: "Détail de OP-43-027" }).click();
    const fiche = page.getByRole("dialog", { name: "Détail du mouvement" });
    await expect(fiche).toContainText("Consultation seule");
    await expect(fiche.getByLabel("Motif")).toHaveCount(0);
    await expect(fiche.getByRole("button", { name: "Contre-passer" })).toHaveCount(0);

    expect((await page.request.get("/admin/comptabilite/2026-S43/csv")).status()).toBe(200);
  });

  test("pages de gestion refusées", async ({ page }) => {
    await page.goto("/admin/connexion");
    await page.getByRole("button", { name: /^Inspecteur Daniel Hart/ }).click();
    await expect(page).toHaveURL(/\/admin\/comptabilite$/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/comptabilite$/);
    for (const chemin of [
      "/admin/vehicules",
      "/admin/contrats/nouveau",
      "/admin/comptes",
      "/admin/parametres",
    ]) {
      await page.goto(chemin);
      await expect(page, chemin).toHaveURL(/\/admin\/acces-refuse\?raison=role/);
    }
  });
});

test.describe("photos des cartes de l'accueil", () => {
  test.afterAll(async () => {
    await sql(`UPDATE "Parametres" SET "photosAccueil" = '{}' WHERE id = 1`);
    await sql(`DELETE FROM "JournalAudit" WHERE action = 'parametres.photoAccueil'`);
  });

  test("photo choisie dans Paramètres, retour au visuel par défaut", async ({ page }) => {
    const carteBateaux = () =>
      page
        .getByRole("link", { name: /Bateaux/ })
        .filter({ has: page.locator("img") })
        .first()
        .locator("img")
        .first();

    await page.goto("/");
    await expect(carteBateaux()).toHaveAttribute("src", /bg-mer/);

    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/parametres#photos");
    const photos = page.getByRole("region", { name: "Photos de l’accueil" });
    await photos.locator('input[type="file"]').first().setInputFiles(PHOTO);
    await expect(photos.getByRole("status")).toContainText("« Bateaux » enregistrée");
    const [p] = await sql<{ photosAccueil: { BATEAU?: string } }>(
      `SELECT "photosAccueil" FROM "Parametres" WHERE id = 1`,
    );
    expect(p.photosAccueil.BATEAU).toMatch(/^photos\/.+\.jpg$/);

    await page.goto("/");
    await expect(carteBateaux()).toHaveAttribute(
      "src",
      /api%2Ffichiers%2Fphotos|api\/fichiers\/photos/,
    );

    await page.goto("/admin/parametres#photos");
    await photos.getByRole("button", { name: "Retirer" }).click();
    await expect(photos.getByRole("status")).toContainText("visuel par défaut");
    await page.goto("/");
    await expect(carteBateaux()).toHaveAttribute("src", /bg-mer/);
  });

  test("accessibilité de Paramètres et de Comptes", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    for (const chemin of ["/admin/parametres", "/admin/comptes"]) {
      await page.goto(chemin);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${chemin} : ${v.id}`)).toEqual([]);
    }
  });
});
