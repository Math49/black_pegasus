import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const PAGES = [
  "/",
  "/location",
  "/location/flotte",
  "/location/flotte/luxor",
  "/location/reglement",
  "/formation",
  "/cards",
  "/page-inexistante",
];

test.describe("finitions du site public", () => {
  for (const largeur of [390, 768, 1024, 1440]) {
    test(`aucun défilement horizontal à ${largeur} px`, async ({ page }) => {
      await page.setViewportSize({ width: largeur, height: 900 });
      for (const chemin of PAGES) {
        await page.goto(chemin);
        await page.waitForLoadState("networkidle");
        const largeurDoc = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(largeurDoc, `${chemin} à ${largeur} px`).toBeLessThanOrEqual(largeur);
      }
    });
  }

  test("sonde de santé du conteneur", async ({ request }) => {
    const r = await request.get("/api/sante");
    expect(r.status()).toBe(200);
    expect(await r.json()).toEqual({ etat: "ok" });
  });

  test("en-têtes de sécurité", async ({ request }) => {
    const r = await request.get("/");
    const h = r.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("page 404 dans le style du site, accessible", async ({ page }) => {
    await page.goto("/page-inexistante");
    await expect(page.getByRole("heading", { level: 1, name: "Page introuvable" })).toBeVisible();
    await expect(page.getByText("Erreur 404")).toBeVisible();
    await expect(page.getByRole("link", { name: "Voir la flotte" })).toBeVisible();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });

  test("les justificatifs et PDF restent privés sans session", async ({ request }) => {
    expect((await request.get("/api/fichiers/justificatifs/justificatif-demo.jpg")).status()).toBe(
      401,
    );
    expect((await request.get("/api/fichiers/pdf/inconnu.pdf")).status()).toBe(401);
    const csv = await request.get("/admin/comptabilite/2026-S43/csv", { maxRedirects: 0 });
    expect(csv.status()).toBe(307);
    expect(csv.headers()["location"]).toContain("/admin/connexion");
  });
});
