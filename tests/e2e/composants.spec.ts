import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("page de référence des composants", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/admin/dev/composants");
    await expect(page.getByRole("heading", { name: "Système de composants" })).toBeVisible();
  });

  test("aucune violation d'accessibilité (axe)", async ({ page }) => {
    const resultats = await new AxeBuilder({ page }).analyze();
    expect(
      resultats.violations.map((v) => `${v.id} : ${v.nodes.map((n) => n.target).join(", ")}`),
    ).toEqual([]);
  });

  test("interrupteurs : role switch et aria-checked", async ({ page }) => {
    const interrupteur = page.getByRole("switch", { name: "Disponible uniquement" });
    await expect(interrupteur).toHaveAttribute("aria-checked", "true");
    await interrupteur.click();
    await expect(interrupteur).toHaveAttribute("aria-checked", "false");
    await page.getByText("Désactivé").click(); // clic sur le libellé
    await expect(page.getByRole("switch", { name: "Désactivé" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    await interrupteur.focus();
    await page.keyboard.press("Space");
    await expect(interrupteur).toHaveAttribute("aria-checked", "true");
  });

  test("onglets au clavier", async ({ page }) => {
    const bateaux = page.getByRole("tab", { name: /Bateaux/ });
    await bateaux.focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: /Avions/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tab", { name: /Avions/ })).toBeFocused();
    await expect(bateaux).toHaveAttribute("aria-selected", "false");
  });

  test("focus visible au clavier sur un bouton or", async ({ page }) => {
    const bouton = page.getByRole("link", { name: "Appeler le 555-XXXX" });
    await bouton.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    await expect(bouton).toBeFocused();
    const outline = await bouton.evaluate((el) => getComputedStyle(el).outlineStyle);
    expect(outline).toBe("solid");
  });

  test("modale : ouverture, Échap, retour du focus", async ({ page }) => {
    const declencheur = page.getByRole("button", { name: "Nouveau mouvement" });
    await declencheur.click();
    const modale = page.getByRole("dialog", { name: "Nouveau mouvement" });
    await expect(modale).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(modale).toBeHidden();
    await expect(declencheur).toBeFocused();
  });

  test("boutons icônes nommés", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Notifications" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Supprimer l’exemplaire" })).toBeVisible();
  });
});
