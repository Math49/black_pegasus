import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { connexion, sql } from "./outils";

type Filiale = {
  code: string;
  nom: string;
  accroche: string;
  telephone: string;
  horaires: string;
  logo: string;
  ordre: number;
  visible: boolean;
};
type Groupe = { nomEntreprise: string; textesGroupe: unknown };
let filiales: Filiale[];
let groupe: Groupe;

test.beforeEach(async () => {
  filiales = await sql<Filiale>(`SELECT * FROM "Filiale" ORDER BY ordre`);
  [groupe] = await sql<Groupe>(
    `SELECT "nomEntreprise", "textesGroupe" FROM "Parametres" WHERE id = 1`,
  );
});

test.afterEach(async () => {
  const apres = await sql<Filiale>(`SELECT * FROM "Filiale"`);
  for (const f of filiales) {
    await sql(
      `UPDATE "Filiale" SET nom=$2, accroche=$3, telephone=$4, horaires=$5, logo=$6, ordre=$7, visible=$8 WHERE code=$1`,
      [f.code, f.nom, f.accroche, f.telephone, f.horaires, f.logo, f.ordre, f.visible],
    );
  }
  await sql(`UPDATE "Parametres" SET "nomEntreprise"=$1, "textesGroupe"=$2 WHERE id=1`, [
    groupe.nomEntreprise,
    JSON.stringify(groupe.textesGroupe),
  ]);
  await sql(
    `DELETE FROM "JournalAudit" WHERE action IN ('parametres.filiale', 'parametres.textesGroupe', 'parametres.agence')`,
  );
  for (const f of apres) {
    if (
      !filiales.some((avant) => avant.logo === f.logo) &&
      /^\/api\/fichiers\/photos\/[\w-]+\.(png|jpg|webp)$/.test(f.logo)
    ) {
      await unlink(
        path.resolve(process.env.STOCKAGE_DIR ?? "data", f.logo.slice("/api/fichiers/".length)),
      );
    }
  }
});

test("accueil groupe : seules les filiales visibles apparaissent, liens internes à jour", async ({
  page,
}) => {
  await page.goto("/");
  const cartes = page.locator("#filiales");
  await expect(
    cartes.getByRole("heading", { name: "Black Pégasus Location", exact: true }),
  ).toBeVisible();
  await expect(cartes.locator("a")).toHaveCount(2);
  await expect(cartes.locator("a").first()).toHaveAttribute("href", "/location");
  await expect(
    page
      .getByRole("navigation", { name: "Navigation principale" })
      .getByRole("link", { name: "Cards" }),
  ).toHaveCount(0);
  for (const route of [
    "/",
    "/location",
    "/location/flotte",
    "/location/flotte/luxor",
    "/location/reglement",
  ]) {
    await page.goto(route);
    await expect(page.locator('a[href^="/flotte"], a[href^="/reglement"]')).toHaveCount(0);
  }
});

test("anciennes adresses : redirections 308 avec conservation de la requête", async ({
  request,
}) => {
  for (const [source, cible] of [
    ["/flotte?type=AVION&dispo=1", "/location/flotte?type=AVION&dispo=1"],
    ["/flotte/luxor?origine=ancien", "/location/flotte/luxor?origine=ancien"],
    ["/reglement?article=2", "/location/reglement?article=2"],
  ]) {
    const r = await request.get(source, { maxRedirects: 0 });
    expect(r.status()).toBe(308);
    expect(
      new URL(r.headers().location, r.url()).pathname +
        new URL(r.headers().location, r.url()).search,
    ).toBe(cible);
  }
});

test("une filiale masquée est introuvable, y compris toute la section Location", async ({
  page,
}) => {
  await sql(`UPDATE "Filiale" SET visible=false`);
  for (const route of [
    "/formation",
    "/cards",
    "/location",
    "/location/flotte",
    "/location/flotte/luxor",
    "/location/reglement",
  ]) {
    await page.goto(route);
    await expect(
      page.getByRole("heading", { name: "Page introuvable", exact: true }),
    ).toBeVisible();
    // Next conserve un statut 200 quand le flux a déjà commencé : sa 404 porte noindex.
    await expect(page.locator('meta[name="robots"][content*="noindex"]').first()).toBeAttached();
    await expect(page.locator('[data-filiale="location"]')).toHaveCount(0);
  }
  await page.goto("/");
  await expect(page.locator("#filiales a")).toHaveCount(0);
});

test("paramètres : identité du groupe et textes modifiés, variables remplacées et audit", async ({
  page,
}) => {
  await connexion(page, "Vincent Moretti");
  await page.goto("/admin/parametres");
  const identite = page.getByRole("region", { name: "Groupe", exact: true });
  await identite.getByLabel("Nom du groupe").fill("Compagnie Pégasus e2e");
  await identite.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(identite.getByRole("status")).toBeVisible();
  const textes = page.getByRole("region", { name: "Accueil du groupe", exact: true });
  await textes.getByLabel("Accroche du groupe · titre").fill("Ensemble, *plus loin*");
  await textes
    .getByLabel("Accroche du groupe · texte")
    .fill("Notre équipe vous répond au {{telephone}}. [Voir la flotte](/flotte).");
  await textes.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(textes.getByRole("status")).toBeVisible();
  await page.goto("/");
  await expect(page).toHaveTitle("Compagnie Pégasus e2e");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Ensemble, plus loin");
  await expect(page.getByText(/Notre équipe vous répond/)).toContainText("555-XXXX");
  await expect(page.getByRole("link", { name: "Voir la flotte", exact: true })).toHaveAttribute(
    "href",
    "/location/flotte",
  );
  expect(
    await sql(`SELECT id FROM "JournalAudit" WHERE action='parametres.textesGroupe'`),
  ).toHaveLength(1);
});

test("filiales : contact, ordre, logo envoyé et visibilité se répercutent aussitôt", async ({
  page,
}) => {
  await connexion(page, "Vincent Moretti");
  await page.goto("/admin/parametres");
  const cards = page.getByRole("region", { name: "Filiale · Cards", exact: true });
  await cards.getByLabel("Téléphone en jeu").fill("555-0201 / 555-0202");
  await cards.getByLabel("Horaires", { exact: true }).fill("Tous les soirs en jeu");
  await cards.getByLabel("Ordre d’affichage").fill("0");
  await cards.getByLabel("Logo de la filiale").setInputFiles("public/images/logos/bp-cards.webp");
  await cards.getByRole("switch", { name: "Visible sur le site" }).click();
  await cards.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(cards.getByRole("status")).toBeVisible();
  const [f] = await sql<Filiale>(`SELECT * FROM "Filiale" WHERE code='BPC'`);
  expect(f.logo).toMatch(/^\/api\/fichiers\/photos\/.+\.webp$/);
  await page.goto("/");
  await expect(page.locator("#filiales a").first()).toHaveAttribute("href", "/cards");
  await page.locator("#filiales a").first().click();
  await expect(page.getByRole("heading", { level: 1, name: f.nom })).toBeVisible();
  await expect(page.getByRole("button", { name: "Appeler le 555-0201" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Appeler le 555-0202" })).toBeVisible();
  await expect(page.getByText("Tous les soirs en jeu").first()).toBeVisible();
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => v.id)).toEqual([]);
});

test("logo invalide : écriture refusée sans modification de la filiale", async ({ page }) => {
  await connexion(page, "Vincent Moretti");
  await page.goto("/admin/parametres");
  const f = page.getByRole("region", { name: "Filiale · Formation", exact: true });
  await f.getByLabel("Nom de la filiale").fill("Nom qui ne doit pas être enregistré");
  await f.getByLabel("Logo de la filiale").setInputFiles({
    name: "faux.png",
    mimeType: "image/png",
    buffer: Buffer.from("image invalide"),
  });
  await f.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(f.getByRole("alert")).toContainText("Format refusé");
  expect((await sql<Filiale>(`SELECT * FROM "Filiale" WHERE code='BPF'`))[0].nom).toBe(
    "Black Pégasus Formation",
  );
});

test("trois filiales visibles : responsive, axe et contrastes des accents", async ({ page }) => {
  await sql(`UPDATE "Filiale" SET visible=true`);
  for (const route of ["/", "/location", "/formation", "/cards"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const entete = page.getByRole("banner");
    const courante = filiales.find(
      (f) =>
        `/${f.code === "BPL" ? "location" : f.code === "BPF" ? "formation" : "cards"}` === route,
    );
    if (courante) {
      await expect(entete.getByRole("link", { name: `${courante.nom} – Accueil` })).toHaveAttribute(
        "href",
        route,
      );
      await expect(entete.getByRole("link", { name: "Retour au groupe" })).toBeVisible();
    }
    for (const largeur of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width: largeur, height: 900 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${route} à ${largeur}`,
      ).toBeLessThanOrEqual(largeur);
    }
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${route} ${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
    if (route !== "/") {
      const couleurs = await page
        .locator("[data-filiale]")
        .first()
        .evaluate((e) => {
          const style = getComputedStyle(e);
          return {
            accent: style.getPropertyValue("--bp-accent").trim(),
            noir: style.getPropertyValue("--bp-black").trim(),
          };
        });
      const luminance = (hex: string) => {
        const rgb = hex
          .replace("#", "")
          .match(/.{2}/g)!
          .map((v) => parseInt(v, 16) / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      expect(
        (luminance(couleurs.accent) + 0.05) / (luminance(couleurs.noir) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
      const bouton = page.locator("[data-filiale] .bp-btn--or").first();
      await expect(bouton).toBeVisible();
      const fond = await bouton.evaluate((e) => getComputedStyle(e).backgroundImage);
      const accent = await bouton.evaluate((e) => {
        const x = document.createElement("span");
        x.style.color = "var(--bp-accent)";
        e.append(x);
        const c = getComputedStyle(x).color;
        x.remove();
        return c;
      });
      expect(fond).toContain(accent);
      if (route === "/location") {
        expect(
          await page.locator("h1 .texte-or").evaluate((e) => getComputedStyle(e).backgroundImage),
        ).toContain(accent);
      }
    }
  }
});
