import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { connexion, sql } from "./outils";

// Enchères de cartes (REFONTE-ADMIN § 5). Horloge de démonstration : 2026-10-24T19:40:00Z.

const CARTE = "Loup des neiges";

let stock = 0;
let compteurVentes: number | null = null;
let compteursSemaines: { id: string; compteurOperations: number }[] = [];

async function enchere() {
  return (
    await sql<{ id: string; statut: string; fin: string; venteId: string | null }>(
      `SELECT e.id, e.statut, to_char(e."finPrevue", 'YYYY-MM-DD"T"HH24:MI') AS fin, e."venteId" FROM "Enchere" e
       JOIN "Carte" c ON c.id = e."carteId" WHERE c.nom = $1 ORDER BY e."creeLe" DESC LIMIT 1`,
      [CARTE],
    )
  )[0];
}

async function nettoyer() {
  const ventes = (
    await sql<{ venteId: string }>(
      `SELECT e."venteId" FROM "Enchere" e JOIN "Carte" c ON c.id = e."carteId"
       WHERE c.nom = $1 AND e."venteId" IS NOT NULL`,
      [CARTE],
    )
  ).map((v) => v.venteId);
  await sql(`DELETE FROM "Enchere" WHERE "carteId" IN (SELECT id FROM "Carte" WHERE nom = $1)`, [
    CARTE,
  ]);
  if (ventes.length) {
    await sql(`DELETE FROM "Mouvement" WHERE "venteCarteId" = ANY($1)`, [ventes]);
    await sql(`DELETE FROM "VenteCarte" WHERE id = ANY($1)`, [ventes]);
  }
  await sql(`DELETE FROM "JournalAudit" WHERE action LIKE 'enchere.%'`);
}

async function encherir(page: Page, nom: string, montant: string) {
  const form = page.getByRole("form", { name: "Enchérir" });
  await form.getByLabel("Nom RP").fill(nom);
  await form.getByLabel("Téléphone en jeu").fill("555-0199");
  await form.getByLabel("Votre offre ($)").fill(montant);
  await form.getByRole("button", { name: "Placer mon offre" }).click();
  return form;
}

test.describe.configure({ mode: "serial" });

test.describe("enchères", () => {
  test.beforeAll(async () => {
    await nettoyer();
    stock = (await sql<{ stock: number }>(`SELECT stock FROM "Carte" WHERE nom = $1`, [CARTE]))[0]
      .stock;
    compteurVentes =
      (await sql<{ valeur: number }>(`SELECT valeur FROM "Compteur" WHERE cle = 'BPC-2026'`))[0]
        ?.valeur ?? null;
    compteursSemaines = await sql(`SELECT id, "compteurOperations" FROM "Semaine"`);
  });
  test.afterAll(async () => {
    await nettoyer();
    await sql(`UPDATE "Carte" SET stock = $2 WHERE nom = $1`, [CARTE, stock]);
    if (compteurVentes === null) await sql(`DELETE FROM "Compteur" WHERE cle = 'BPC-2026'`);
    else await sql(`UPDATE "Compteur" SET valeur = $1 WHERE cle = 'BPC-2026'`, [compteurVentes]);
    for (const s of compteursSemaines)
      await sql(`UPDATE "Semaine" SET "compteurOperations" = $2 WHERE id = $1`, [
        s.id,
        s.compteurOperations,
      ]);
  });

  test("mise en enchère d'une carte existante depuis le panel", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/cards");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: /^BP-01 / }).click();
    await page.getByRole("button", { name: `Modifier ${CARTE}` }).click();
    const form = page.getByRole("dialog", { name: `Modifier ${CARTE}` });
    await form.getByLabel("Mettre en vente").selectOption("enchere");
    await form.getByLabel("Montant de départ ($)").fill("500");
    await form.getByLabel("Pas minimum entre deux offres ($)").fill("50");
    await form.getByLabel("Durée", { exact: true }).fill("1");
    await form.getByLabel("Unité de durée").selectOption("jours");
    await form.getByLabel("Temps additionnel (minutes)").fill("10");
    await form.getByRole("button", { name: "Enregistrer la carte" }).click();
    await expect(form).toBeHidden();

    const e = await enchere();
    expect(e.statut).toBe("OUVERTE");
    expect(e.fin).toBe("2026-10-25T19:40"); // UTC en base
    const tuile = page.getByRole("listitem", { name: CARTE });
    await expect(tuile).toContainText(`Mise à prix $500`);
    await expect(tuile.getByRole("link", { name: `Voir l’enchère de ${CARTE}` })).toBeVisible();

    // Une carte aux enchères n'est pas proposée à la vente classique.
    await page.goto("/admin/cards/ventes?nouvelle=1");
    await expect(
      page.getByRole("dialog", { name: "Nouvelle vente" }).getByRole("button", {
        name: new RegExp(`^Ajouter ${CARTE} `),
      }),
    ).toHaveCount(0);
  });

  test("site public : offres, minimum, anonymat des enchérisseurs", async ({ page }) => {
    await page.goto("/cards");
    const carte = page.getByRole("article").filter({ hasText: CARTE });
    await expect(carte).toContainText("Mise à prix");
    // Carte mise en valeur : pastille « Enchère », bouton « Enchérir ».
    await expect(carte).toContainText("Enchère");
    await carte.getByRole("link", { name: `Enchérir sur ${CARTE}` }).click();
    await expect(page.getByRole("heading", { level: 1, name: CARTE })).toBeVisible();

    let form = await encherir(page, "Ada Lovelace", "400");
    await expect(form.getByRole("alert")).toContainText(`au moins $500`);
    form = await encherir(page, "Ada Lovelace", "500");
    await expect(form.getByRole("status")).toContainText("Offre enregistrée");
    form = await encherir(page, "Bob Marley", "520");
    await expect(form.getByRole("alert")).toContainText(`au moins $550`);
    form = await encherir(page, "Bob Marley", "600");
    await expect(form.getByRole("status")).toContainText("Offre enregistrée");

    await page.reload();
    await expect(page.getByText(`Offre actuelle`)).toBeVisible();
    const offres = page.getByRole("region", { name: "Dernières offres" });
    await expect(offres.getByRole("listitem")).toHaveCount(2);
    await expect(offres).toContainText(`$600`);
    // Aucun nom ni téléphone d'enchérisseur sur le site.
    await expect(page.getByText("Ada Lovelace")).toHaveCount(0);
    await expect(page.getByText("555-0199")).toHaveCount(0);
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
  });

  test("prolongation : une offre tardive repousse la fin", async ({ page }) => {
    const e = await enchere();
    // Il reste 5 minutes ; temps additionnel 10 minutes.
    await sql(`UPDATE "Enchere" SET "finPrevue" = '2026-10-24T19:45:00Z' WHERE id = $1`, [e.id]);
    await page.goto(`/cards/encheres/${e.id}`);
    const form = await encherir(page, "Troll", "99999");
    await expect(form.getByRole("status")).toContainText("Offre enregistrée");
    expect((await enchere()).fin).toBe("2026-10-24T19:50");
  });

  test("panel : offre écartée, enchérisseur suivant, conclusion", async ({ page, browser }) => {
    const e = await enchere();
    await connexion(page, "Vincent Moretti");
    await page.goto(`/admin/cards/encheres/${e.id}`);
    const offres = page.getByRole("table", { name: "Offres de l’enchère" });
    await expect(offres).toContainText("Ada Lovelace");
    await expect(offres).toContainText("555-0199");
    // L'administrateur écarte l'offre fantaisiste.
    await offres
      .getByRole("row")
      .filter({ hasText: "Troll" })
      .getByRole("button", { name: "Écarter" })
      .click();
    await page.getByRole("button", { name: "Écarter l’offre" }).click();
    await expect(offres.getByRole("row").filter({ hasText: "Troll" })).toContainText("Écartée");

    // Fin passée : enchère à conclure, signalée par la cloche.
    await sql(`UPDATE "Enchere" SET "finPrevue" = '2026-10-24T19:00:00Z' WHERE id = $1`, [e.id]);
    await page.reload();
    await expect(page.getByText("Terminée · à conclure")).toBeVisible();
    await page.getByRole("button", { name: /^Notifications/ }).click();
    await expect(
      page.getByRole("link", { name: `Enchère terminée sur ${CARTE} : à conclure` }),
    ).toBeVisible();
    await page.keyboard.press("Escape");

    // Un gestionnaire ne peut pas écarter une offre fantaisiste.
    const gestion = await (await browser.newContext()).newPage();
    await connexion(gestion, "Lena Castillo");
    await gestion.goto(`/admin/cards/encheres/${e.id}`);
    await expect(gestion.getByRole("button", { name: "Écarter" })).toHaveCount(0);
    await gestion.close();

    // Bob ne paie pas : on passe à Ada.
    await page.getByRole("button", { name: "Passer à l’enchérisseur suivant" }).click();
    await page.getByRole("button", { name: "Écarter et passer au suivant" }).click();
    await expect(offres.getByRole("row").filter({ hasText: "Bob Marley" })).toContainText(
      "Défaillant",
    );
    await expect(offres.getByRole("row").filter({ hasText: "Ada Lovelace" })).toContainText(
      "Gagnante",
    );

    await page.getByRole("button", { name: "Conclure la vente" }).click();
    await page
      .getByRole("dialog", { name: "Conclure la vente" })
      .getByRole("button", { name: "Conclure" })
      .click();
    await expect(page.getByText("Vente enregistrée : BPC-")).toBeVisible();
    const apres = await enchere();
    expect(apres.statut).toBe("CONCLUE");
    const [vente] = await sql<{ montant: number; clientNom: string; clientTelephone: string }>(
      `SELECT montant, "clientNom", "clientTelephone" FROM "VenteCarte" WHERE id = $1`,
      [apres.venteId],
    );
    expect(vente).toEqual({ montant: 500, clientNom: "Ada Lovelace", clientTelephone: "555-0199" });
    expect(
      (await sql<{ stock: number }>(`SELECT stock FROM "Carte" WHERE nom = $1`, [CARTE]))[0].stock,
    ).toBe(stock - 1);

    await page.goto(`/cards/encheres/${e.id}`);
    await expect(page.getByText("Adjugée")).toBeVisible();
    await expect(page.getByText(`$500`).first()).toBeVisible();
    await expect(page.getByRole("form", { name: "Enchérir" })).toHaveCount(0);
  });
});
