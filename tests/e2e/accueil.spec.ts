import { expect, test } from "@playwright/test";

test("polices locales chargées, aucune requête Google Fonts", async ({ page }) => {
  const requetesExternes: string[] = [];
  page.on("request", (r) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(r.url())) requetesExternes.push(r.url());
  });

  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Plusieurs horizons/ })).toBeVisible();

  const polices = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      montserrat: document.fonts.check('600 16px "Montserrat"'),
      manrope: document.fonts.check('400 16px "Manrope"'),
    };
  });
  expect(polices).toEqual({ montserrat: true, manrope: true });
  expect(requetesExternes).toEqual([]);
});
