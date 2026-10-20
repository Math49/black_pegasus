import { expect, test } from "@playwright/test";

test("la page d'accueil provisoire s'affiche sans Google Fonts", async ({ page }) => {
  const requetesExternes: string[] = [];
  page.on("request", (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) requetesExternes.push(r.url());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "BLACK PÉGASUS" })).toBeVisible();
  await expect(page.getByAltText("Logo Black Pégasus – American Transports")).toBeVisible();

  const polices = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      montserrat: document.fonts.check('700 16px "Montserrat"'),
      manrope: document.fonts.check('400 16px "Manrope"'),
    };
  });
  expect(polices).toEqual({ montserrat: true, manrope: true });
  expect(requetesExternes).toEqual([]);
});
