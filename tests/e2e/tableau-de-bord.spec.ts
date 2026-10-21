import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connexion } from "./outils";

const NBSP = " ";

test.describe("tableau de bord", () => {
  test("chiffres de la capture 11 avec le seed", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Bonsoir, Vincent");

    const solde = page.getByRole("region", { name: "Solde de l’entreprise" });
    await expect(solde).toContainText(`$514${NBSP}630`);
    await expect(solde).toContainText(`+$102${NBSP}250 · +24,8${NBSP}%`);
    await expect(solde).toContainText(`depuis lundi 19/10 (ouverture : $412${NBSP}380)`);

    const kpi = page.getByRole("region", { name: "Indicateurs de la semaine" });
    for (const texte of [
      `$91${NBSP}400`,
      `+8,0${NBSP}% vs S42`,
      `$24${NBSP}150`,
      `dont impôts S42 : $12${NBSP}600`,
      "1 en retard",
      `$35${NBSP}000`,
    ])
      await expect(kpi).toContainText(texte);

    const contrats = page.getByRole("table", { name: "Contrats en cours" });
    await expect(contrats.getByRole("row")).toHaveCount(6);
    await expect(contrats.getByRole("row").nth(1)).toContainText("Chen Wu");
    await expect(contrats.getByRole("row").nth(1)).toContainText("Retard · 40 min");
    await expect(contrats.getByRole("row").nth(5)).toContainText("Dim. 08:00");

    await expect(
      page.getByRole("img", { name: /S36 \$54.200.*S43 \$91.400 \(semaine en cours\)/ }),
    ).toBeVisible();
  });

  test("raccourci « Nouveau mouvement » : ouvre la saisie sur la page Solde", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.getByRole("link", { name: "Nouveau mouvement" }).click();
    await expect(page).toHaveURL(/\/admin\/solde\?nouveau=1/);
    await expect(page.getByRole("dialog", { name: "Nouveau mouvement" })).toBeVisible();
  });

  test("accessibilité", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.waitForLoadState("networkidle");
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
});
