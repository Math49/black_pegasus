import { expect, test, type Page } from "@playwright/test";
import { connexion, sql } from "./outils";

const NOUVEL_ID = "734205918846263296";
const ligne = (page: Page, nom: string) =>
  page.getByRole("table", { name: "Comptes autorisés" }).getByRole("row").filter({ hasText: nom });

test.describe("page Comptes (administrateur)", () => {
  test.beforeEach(async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/comptes");
    await expect(page.getByRole("heading", { level: 1, name: "Comptes autorisés" })).toBeVisible();
  });

  test.afterAll(async () => {
    await sql(`DELETE FROM "Compte" WHERE "discordId" = $1`, [NOUVEL_ID]);
    await sql(
      `UPDATE "Compte" SET actif = true, role = 'GESTIONNAIRE' WHERE pseudo IN ('lena.cstl', 'duke_hale')`,
    );
  });

  test("ajout d'un compte par identifiant Discord, journalisé", async ({ page }) => {
    await page.getByRole("button", { name: "Ajouter un compte" }).click();
    const modale = page.getByRole("dialog", { name: "Ajouter un compte" });
    await modale.getByLabel("Identifiant Discord").fill(NOUVEL_ID);
    await modale.getByRole("button", { name: "Vérifier" }).click();
    await expect(modale.getByText(/Aperçu Discord indisponible|compte trouvé/)).toBeVisible();
    await modale.getByText("Gestionnaire", { exact: true }).click();
    await modale.getByRole("button", { name: "Ajouter le compte" }).click();
    await expect(modale).toBeHidden();

    await expect(ligne(page, NOUVEL_ID)).toContainText("Gestionnaire");
    await expect(ligne(page, NOUVEL_ID)).toContainText("Vincent Moretti");
    const journal = page.getByRole("table", { name: "Journal d’activité" });
    await expect(
      journal.getByRole("row").filter({ hasText: "Compte ajouté" }).first(),
    ).toContainText(NOUVEL_ID);
  });

  test("identifiant déjà autorisé ou invalide", async ({ page }) => {
    await page.getByRole("button", { name: "Ajouter un compte" }).click();
    const modale = page.getByRole("dialog", { name: "Ajouter un compte" });
    await modale.getByLabel("Identifiant Discord").fill("402981736650211328");
    await modale.getByRole("button", { name: "Vérifier" }).click();
    await expect(modale.getByText("Déjà autorisé : Lena Castillo.")).toBeVisible();
    await expect(modale.getByRole("button", { name: "Ajouter le compte" })).toBeDisabled();

    await modale.getByLabel("Identifiant Discord").fill("12345");
    await modale.getByRole("button", { name: "Vérifier" }).click();
    await expect(modale.getByText("Identifiant invalide : 17 à 20 chiffres.")).toBeVisible();
  });

  test("désactivation puis réactivation, journalisées", async ({ page }) => {
    const interrupteur = page.getByRole("switch", { name: "Compte de Lena Castillo actif" });
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute("aria-checked", "false");
    await expect(ligne(page, "@lena.cstl")).toContainText("Inactif");
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute("aria-checked", "true");

    const journal = page.getByRole("table", { name: "Journal d’activité" });
    await expect(
      journal.getByRole("row").filter({ hasText: "Compte désactivé" }).first(),
    ).toContainText("Lena Castillo");
    await expect(
      journal.getByRole("row").filter({ hasText: "Compte réactivé" }).first(),
    ).toContainText("Lena Castillo");
  });

  test("changement de rôle par le menu d'actions", async ({ page }) => {
    await page.getByRole("button", { name: "Plus d’actions pour Marcus Hale" }).click();
    await page.getByRole("menuitem", { name: "Passer administrateur" }).click();
    await expect(ligne(page, "Marcus Hale")).toContainText("Administrateur");
    await expect(
      page
        .getByRole("table", { name: "Journal d’activité" })
        .getByRole("row")
        .filter({ hasText: "Rôle modifié" })
        .first(),
    ).toContainText("Marcus Hale : Gestionnaire → Administrateur");

    await page.getByRole("button", { name: "Plus d’actions pour Marcus Hale" }).click();
    await page.getByRole("menuitem", { name: "Passer gestionnaire" }).click();
    await expect(ligne(page, "Marcus Hale")).toContainText("Gestionnaire");
  });

  test("on ne peut ni se désactiver ni se rétrograder soi-même", async ({ page }) => {
    await expect(
      page.getByRole("switch", { name: "Compte de Vincent Moretti actif" }),
    ).toBeDisabled();
    await page.getByRole("button", { name: "Plus d’actions pour Vincent Moretti" }).click();
    await expect(page.getByRole("menuitem", { name: "Passer gestionnaire" })).toBeDisabled();
    await expect(page.getByRole("menuitem", { name: "Désactiver le compte" })).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toBeHidden();
  });
});
