import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connexion } from "./outils";

// Phase F-5 : comptabilité commune ventilée par filiale (données S43 du seed).

test("comptabilité : tableau par filiale et filtre du registre", async ({ page }) => {
  await connexion(page, "Lena Castillo");
  await page.goto("/admin/comptabilite");
  const parFiliale = page.getByRole("table", { name: /Ventilation par filiale/ });
  await expect(parFiliale.getByRole("row").filter({ hasText: "Location" })).toContainText(
    "$79 850",
  );
  await expect(
    parFiliale.getByRole("row").filter({
      has: page.getByRole("link", { name: "Filtrer le registre : Groupe" }),
    }),
  ).toContainText("$12 600");
  await expect(parFiliale.getByRole("row").filter({ hasText: "Groupe · total" })).toContainText(
    "$67 250",
  );

  await page
    .getByRole("navigation", { name: "Filtrer le registre par filiale" })
    .getByRole("link", { name: "Groupe" })
    .click();
  await expect(page).toHaveURL(/filiale=groupe/);
  const registre = page.getByRole("table", { name: /Registre des opérations/ });
  await expect(registre).toContainText("Totaux · 1 opération");
  await expect(registre).toContainText("Impôts");

  // Le filtre se combine aux onglets.
  await page
    .getByRole("navigation", { name: "Filtrer le registre" })
    .getByRole("link", { name: /^Cautions/ })
    .click();
  await expect(page).toHaveURL(/onglet=cautions.*filiale=groupe|filiale=groupe.*onglet=cautions/);
  await expect(registre).toContainText("Totaux · 0 opération");

  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
});

test("solde : filtre par filiale ; CSV avec la colonne Filiale", async ({ page }) => {
  await connexion(page, "Lena Castillo");
  await page.goto("/admin/solde?periode=2026-S43");
  await page.getByRole("combobox", { name: "Filiale" }).selectOption("groupe");
  await expect(page).toHaveURL(/filiale=groupe/);
  const historique = page.getByRole("table", { name: "Historique des mouvements" });
  await expect(historique.getByRole("row")).toHaveCount(2);
  await expect(historique).toContainText("Impôts");

  const csv = await (await page.request.get("/admin/comptabilite/2026-S43/csv")).text();
  const [entete, premiere] = csv.trim().split("\r\n");
  expect(entete).toContain("Catégorie;Filiale;Libellé");
  expect(premiere).toContain("OP-43-001;2026-10-19 09:15;Impôts;Groupe;");
});

test("tableau de bord : recettes de la semaine par filiale", async ({ page }) => {
  await connexion(page, "Vincent Moretti");
  const liste = page.getByRole("list", { name: "Recettes de la semaine par filiale" });
  await expect(liste.getByRole("listitem")).toHaveCount(3);
  await expect(liste.getByRole("listitem").filter({ hasText: "Location" })).toContainText(
    "$91 400",
  );
});
