import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { connexion, sql } from "./outils";

const axe = async (page: import("@playwright/test").Page) =>
  (await new AxeBuilder({ page }).analyze()).violations.map(
    (v) => `${v.id} : ${v.nodes.map((n) => n.target).join(", ")}`,
  );

test("sans session, le panel redirige vers la connexion", async ({ page }) => {
  for (const chemin of ["/admin", "/admin/vehicules", "/admin/comptes"]) {
    await page.goto(chemin);
    await expect(page).toHaveURL(/\/admin\/connexion$/);
  }
  await expect(page.getByRole("heading", { name: "Administration" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("administrateur : gabarit complet, Comptes et Paramètres accessibles", async ({ page }) => {
  await connexion(page, "Vincent Moretti");
  await expect(page.getByRole("heading", { level: 1, name: "Bonsoir, Vincent" })).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Gestion" });
  await expect(nav.getByRole("link")).toHaveText([
    "Tableau de bord",
    "Solde",
    "Véhicules9",
    "Contrats1 retard",
    "Comptabilité",
    "Permis",
    "Demandes2",
    "Cartes",
    "Ventes",
    "Comptes",
    "Paramètres",
  ]);
  await expect(page.getByText("Semaine 43 · ouverte")).toBeVisible();
  await expect(page.getByText("Clôture dimanche 25/10")).toBeVisible();
  await expect(page.locator("header").getByText("Administrateur", { exact: true })).toBeVisible();
  expect(await axe(page)).toEqual([]);

  await nav.getByRole("link", { name: "Comptes" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Comptes" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Comptes" })).toHaveAttribute("aria-current", "page");
});

test("cloche : alertes calculées (retard de CTR-2026-0039)", async ({ page }) => {
  await connexion(page, "Vincent Moretti");
  const cloche = page.getByRole("button", { name: /Notifications, \d+ alerte/ });
  await cloche.click();
  await expect(
    page.getByRole("link", { name: "CTR-2026-0039 · Chen Wu : retard de 40 min" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("link", { name: /CTR-2026-0039/ })).toBeHidden();
});

test("gestionnaire : ni Comptes ni Paramètres", async ({ page }) => {
  await connexion(page, "Lena Castillo");
  const nav = page.getByRole("navigation", { name: "Gestion" });
  await expect(nav.getByRole("link", { name: "Véhicules" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Comptes" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Paramètres" })).toHaveCount(0);
  await expect(page.locator("header").getByText("Gestionnaire", { exact: true })).toBeVisible();

  for (const chemin of ["/admin/comptes", "/admin/parametres"]) {
    await page.goto(chemin);
    await expect(page).toHaveURL(/\/admin\/acces-refuse\?raison=role$/);
    await expect(page.getByText("Cette page est réservée aux administrateurs.")).toBeVisible();
  }
});

test("compte inactif refusé à la connexion", async ({ page }) => {
  await connexion(page, "Sofia Reyes");
  await expect(page).toHaveURL(/\/admin\/acces-refuse$/);
  await expect(page.getByRole("heading", { name: "Accès non autorisé" })).toBeVisible();
  expect(await axe(page)).toEqual([]);
});

test("compte désactivé pendant la session : accès coupé à la requête suivante", async ({
  page,
}) => {
  await connexion(page, "Marcus Hale");
  try {
    await sql(`UPDATE "Compte" SET actif = false WHERE pseudo = 'duke_hale'`);
    await page.goto("/admin/solde");
    await expect(page).toHaveURL(/\/admin\/acces-refuse$/);
  } finally {
    await sql(`UPDATE "Compte" SET actif = true WHERE pseudo = 'duke_hale'`);
  }
});

test("déconnexion : session supprimée, retour à la connexion", async ({ page, context }) => {
  await connexion(page, "Tommy Bishop");
  const jeton = (await context.cookies()).find((c) => c.name === "authjs.session-token")?.value;
  expect(jeton).toBeTruthy();

  await page.getByRole("button", { name: "Déconnexion" }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  expect(await sql(`SELECT 1 FROM "Session" WHERE "sessionToken" = $1`, [jeton])).toHaveLength(0);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/connexion$/);
});
