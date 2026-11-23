import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { connexion, sql } from "./outils";

// Black Pégasus Cards (phase F-4) sur le catalogue de démonstration du seed.

const CLIENT = "Client Essai Cards";
const CARTE_E2E = "Carte essai e2e";
const PHOTO = "public/images/vehicule-placeholder.jpg";

let compteurVentes: number | null = null;
let compteursSemaines: { id: string; compteurOperations: number }[] = [];
let stocks: { id: string; stock: number }[] = [];
let ordres: { id: string; ordre: number; categorieId: string }[] = [];
let ordresCategories: { id: string; ordre: number }[] = [];

async function nettoyer() {
  const ventes = (
    await sql<{ id: string }>(`SELECT id FROM "VenteCarte" WHERE "clientNom" = $1`, [CLIENT])
  ).map((v) => v.id);
  if (ventes.length) {
    // Les contre-passations pointent vers la recette : on les supprime d'abord.
    await sql(
      `DELETE FROM "Mouvement" WHERE "venteCarteId" = ANY($1) AND "annuleMouvementId" IS NOT NULL`,
      [ventes],
    );
    await sql(`DELETE FROM "Mouvement" WHERE "venteCarteId" = ANY($1)`, [ventes]);
    await sql(`DELETE FROM "VenteCarte" WHERE id = ANY($1)`, [ventes]);
  }
  await sql(`DELETE FROM "JournalAudit" WHERE action LIKE 'vente.%' OR action LIKE 'cards.%'`);
  await sql(`DELETE FROM "Carte" WHERE nom = $1`, [CARTE_E2E]);
}

async function stockDe(nom: string) {
  return (await sql<{ stock: number }>(`SELECT stock FROM "Carte" WHERE nom = $1`, [nom]))[0].stock;
}

async function vendre(page: Page, carte: string, quantite: number) {
  await page.goto("/admin/cards/ventes");
  await page.getByRole("button", { name: "Nouvelle vente" }).click();
  const modale = page.getByRole("dialog", { name: "Nouvelle vente" });
  const valeur = await modale
    .locator("option", { hasText: `${carte} ·` })
    .first()
    .getAttribute("value");
  await modale.getByLabel("Carte").selectOption(valeur!);
  await modale.getByLabel("Quantité").fill(String(quantite));
  await modale.getByLabel("Nom du client (RP)").fill(CLIENT);
  return modale;
}

test.describe("Black Pégasus Cards", () => {
  test.beforeAll(async () => {
    await nettoyer();
    compteurVentes =
      (await sql<{ valeur: number }>(`SELECT valeur FROM "Compteur" WHERE cle = 'BPC-2026'`))[0]
        ?.valeur ?? null;
    compteursSemaines = await sql(`SELECT id, "compteurOperations" FROM "Semaine"`);
    stocks = await sql(`SELECT id, stock FROM "Carte"`);
    ordres = await sql(`SELECT id, ordre, "categorieId" FROM "Carte"`);
    ordresCategories = await sql(`SELECT id, ordre FROM "CategorieCarte"`);
  });
  test.afterAll(async () => {
    await nettoyer();
    if (compteurVentes === null) await sql(`DELETE FROM "Compteur" WHERE cle = 'BPC-2026'`);
    else await sql(`UPDATE "Compteur" SET valeur = $1 WHERE cle = 'BPC-2026'`, [compteurVentes]);
    for (const s of compteursSemaines)
      await sql(`UPDATE "Semaine" SET "compteurOperations" = $2 WHERE id = $1`, [
        s.id,
        s.compteurOperations,
      ]);
    for (const c of stocks)
      await sql(`UPDATE "Carte" SET stock = $2 WHERE id = $1`, [c.id, c.stock]);
    for (const c of ordres)
      await sql(`UPDATE "Carte" SET ordre = $2, "categorieId" = $3 WHERE id = $1`, [
        c.id,
        c.ordre,
        c.categorieId,
      ]);
    for (const c of ordresCategories)
      await sql(`UPDATE "CategorieCarte" SET ordre = $2 WHERE id = $1`, [c.id, c.ordre]);
  });

  test("catalogue public : catégories, recherche, carte épuisée, axe", async ({ page }) => {
    await page.goto("/cards");
    await expect(
      page.getByRole("heading", { level: 1, name: "Black Pégasus Cards" }),
    ).toBeVisible();
    const phenix = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: "Phénix solaire" }) });
    await expect(phenix).toContainText("Épuisée");
    await expect(phenix).toContainText("$1 500");
    await expect(
      page
        .getByRole("article")
        .filter({ has: page.getByRole("heading", { name: "Pégase d’ébène" }) }),
    ).toContainText("1 exemplaire");

    await page.getByRole("link", { name: /^Rares/ }).click();
    await expect(page).toHaveURL(/categorie=rares/);
    await expect(page.getByRole("heading", { name: "Faucon pèlerin" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Phénix solaire" })).toHaveCount(0);

    await page.goto("/cards");
    await page.getByRole("searchbox", { name: "Nom de la carte" }).fill("PEGASE");
    await page.getByRole("button", { name: "Rechercher" }).click();
    await expect(page).toHaveURL(/q=PEGASE/);
    await expect(page.getByRole("heading", { name: "Pégase d’ébène" })).toBeVisible();
    await expect(page.getByRole("article")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /^Appeler pour acheter/ }).first()).toBeVisible();

    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
  });

  test("vente → stock, registre (BPC, Cards) puis annulation par l'administrateur", async ({
    page,
  }) => {
    const avant = await stockDe("Faucon pèlerin");
    await connexion(page, "Vincent Moretti");
    const modale = await vendre(page, "Faucon pèlerin", 2);
    await expect(modale).toContainText("$900");
    await modale.getByRole("button", { name: "Enregistrer la vente" }).click();
    await expect(modale).toBeHidden();
    expect(await stockDe("Faucon pèlerin")).toBe(avant - 2);

    const [vente] = await sql<{ id: string; numero: string; montant: number }>(
      `SELECT id, numero, montant FROM "VenteCarte" WHERE "clientNom" = $1`,
      [CLIENT],
    );
    expect(vente.numero).toMatch(/^BPC-2026-\d{4}$/);
    expect(vente.montant).toBe(900);
    const [recette] = await sql<{ categorie: string; filiale: string; sens: string }>(
      `SELECT categorie, filiale, sens FROM "Mouvement" WHERE "venteCarteId" = $1`,
      [vente.id],
    );
    expect(recette).toEqual({ categorie: "VENTE_CARTES", filiale: "BPC", sens: "ENTREE" });

    const ligne = page.getByRole("row").filter({ hasText: vente.numero });
    await expect(ligne).toContainText("Validée");

    await page.goto("/admin/comptabilite");
    await expect(page.getByRole("link", { name: vente.numero })).toBeVisible();

    await page.goto("/admin/cards/ventes");
    await page.getByRole("button", { name: `Annuler la vente ${vente.numero}` }).click();
    const confirmation = page.getByRole("dialog", { name: `Annuler la vente ${vente.numero}` });
    await confirmation.getByRole("button", { name: "Annuler la vente" }).click();
    await expect(confirmation).toBeHidden();
    await expect(page.getByRole("row").filter({ hasText: vente.numero })).toContainText("Annulée");
    expect(await stockDe("Faucon pèlerin")).toBe(avant);
    const mouvements = await sql<{ sens: string }>(
      `SELECT sens FROM "Mouvement" WHERE "venteCarteId" = $1 ORDER BY numero`,
      [vente.id],
    );
    expect(mouvements.map((m) => m.sens)).toEqual(["ENTREE", "SORTIE"]);
  });

  test("deux ventes simultanées du dernier exemplaire : une seule passe", async ({ browser }) => {
    expect(await stockDe("Pégase d’ébène")).toBe(1);
    const pages = await Promise.all(
      ["Vincent Moretti", "Lena Castillo"].map(async (nom) => {
        const page = await (await browser.newContext()).newPage();
        await connexion(page, nom);
        await vendre(page, "Pégase d’ébène", 1);
        return page;
      }),
    );
    await Promise.all(
      pages.map((p) => p.getByRole("button", { name: "Enregistrer la vente" }).click()),
    );
    await expect
      .poll(async () =>
        Promise.all(pages.map((p) => p.getByText("Cette carte est épuisée.").isVisible())).then(
          (r) => r.filter(Boolean).length,
        ),
      )
      .toBe(1);
    expect(await stockDe("Pégase d’ébène")).toBe(0);
    expect(
      await sql(
        `SELECT id FROM "VenteCarte" WHERE "clientNom" = $1 AND "carteNom" = 'Pégase d’ébène'`,
        [CLIENT],
      ),
    ).toHaveLength(1);
  });

  test("catalogue du panel : ajout, correction du stock journalisée, retrait", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/cards");
    await page.getByRole("button", { name: "Ajouter une carte" }).click();
    const ajout = page.getByRole("dialog", { name: "Ajouter une carte" });
    await ajout.getByLabel("Nom de la carte").fill(CARTE_E2E);
    await ajout.getByLabel("Catégorie").selectOption({ label: "Rares" });
    await ajout.getByLabel("Prix ($)").fill("275");
    await ajout.getByLabel("Exemplaires en stock").fill("3");
    await ajout.getByRole("button", { name: "Enregistrer la carte" }).click();
    await expect(ajout).toBeHidden();
    expect(await stockDe(CARTE_E2E)).toBe(3);

    // La carte est dans « Rares » : on ouvre cette catégorie (ajoutée en fin de liste).
    await page.getByRole("button", { name: /^Rares/ }).click();
    await expect(page.getByRole("heading", { level: 2, name: "Rares" })).toBeVisible();
    await expect(
      page.getByRole("list", { name: "Cartes", exact: true }).getByRole("listitem").last(),
    ).toHaveAccessibleName(CARTE_E2E);
    await page.getByRole("button", { name: `Modifier ${CARTE_E2E}` }).click();
    const edition = page.getByRole("dialog", { name: `Modifier ${CARTE_E2E}` });
    await edition.getByLabel("Exemplaires en stock").fill("0");
    await edition.getByRole("button", { name: "Enregistrer la carte" }).click();
    await expect(edition).toBeHidden();
    const [journal] = await sql<{ details: { avant: number; apres: number } }>(
      `SELECT details FROM "JournalAudit" WHERE action = 'cards.stock'`,
    );
    expect(journal.details).toMatchObject({ avant: 3, apres: 0 });

    await page.goto("/cards");
    await expect(
      page.getByRole("article").filter({ has: page.getByRole("heading", { name: CARTE_E2E }) }),
    ).toContainText("Épuisée");

    await page.goto("/admin/cards");
    await page.getByLabel("Rechercher dans tout le catalogue").fill(CARTE_E2E);
    await page.getByRole("button", { name: `Retirer ${CARTE_E2E}` }).click();
    await page
      .getByRole("dialog", { name: "Retirer la carte" })
      .getByRole("button", { name: "Retirer la carte" })
      .click();
    await expect(page.getByRole("list", { name: "Cartes", exact: true })).toHaveCount(0);
    await page.goto("/cards");
    await expect(page.getByRole("heading", { name: CARTE_E2E })).toHaveCount(0);
  });

  test("gros volume : ordre au clavier, déplacement vers une catégorie, stock + / −", async ({
    page,
  }) => {
    test.setTimeout(60_000);
    const ordreLegendaires = async () =>
      (
        await sql<{ nom: string }>(
          `SELECT c.nom FROM "Carte" c JOIN "CategorieCarte" k ON k.id = c."categorieId"
           WHERE k.nom = 'Légendaires' AND c."supprimeLe" IS NULL ORDER BY c.ordre, c.nom`,
        )
      ).map((c) => c.nom);
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/cards");
    await page.waitForLoadState("networkidle"); // glisser-déposer actif après hydratation
    const grille = page.getByRole("list", { name: "Cartes", exact: true });
    const avant = await ordreLegendaires();

    // Clavier : la première carte passe en deuxième position.
    await page.getByRole("button", { name: `Déplacer ${avant[0]}` }).focus();
    // Les annonces au lecteur d'écran rythment les étapes (dnd-kit mesure entre deux touches).
    const annonce = (texte: string) =>
      expect(page.getByRole("status").filter({ hasText: texte })).toHaveCount(1);
    await page.keyboard.press("Space");
    await annonce(`${avant[0]} au-dessus de ${avant[0]}.`);
    // dnd-kit mesure les zones de dépôt juste après la saisie.
    await page.waitForTimeout(400);
    await page.keyboard.press("ArrowRight");
    await annonce(`${avant[0]} au-dessus de ${avant[1]}.`);
    await page.keyboard.press("Space");
    await expect(page.getByText("Ordre des cartes enregistré.")).toBeVisible();
    await expect.poll(ordreLegendaires).toEqual([avant[1], avant[0], ...avant.slice(2)]);
    await expect(grille.getByRole("listitem").first()).toHaveAccessibleName(avant[1]);

    // Souris : la carte déposée sur « Communes » y passe, en fin de liste.
    const poignee = page.getByRole("button", { name: `Déplacer ${avant[0]}` });
    const cible = page.getByRole("button", { name: /^Communes/ });
    const a = (await poignee.boundingBox())!;
    const b = (await cible.boundingBox())!;
    await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
    await page.mouse.down();
    await page.mouse.move(a.x + a.width / 2 - 40, a.y + a.height / 2, { steps: 5 });
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 15 });
    await page.mouse.up();
    await expect(page.getByText(`« ${avant[0]} » déplacée dans Communes.`)).toBeVisible();
    const [deplacee] = await sql<{ categorie: string }>(
      `SELECT k.nom AS categorie FROM "Carte" c JOIN "CategorieCarte" k ON k.id = c."categorieId" WHERE c.nom = $1`,
      [avant[0]],
    );
    expect(deplacee.categorie).toBe("Communes");
    await expect(grille).not.toContainText(avant[0]);

    // Stock rapide, journalisé.
    const nom = avant[1];
    const stock = await stockDe(nom);
    await page.getByRole("button", { name: `Ajouter un exemplaire de ${nom}` }).click();
    await expect.poll(() => stockDe(nom)).toBe(stock + 1);
    await page.getByRole("button", { name: `Retirer un exemplaire de ${nom}` }).click();
    await expect.poll(() => stockDe(nom)).toBe(stock);
    const journal = await sql<{ details: { avant: number; apres: number } }>(
      `SELECT details FROM "JournalAudit" WHERE action = 'cards.stock' ORDER BY date`,
    );
    expect(journal.at(-1)?.details).toMatchObject({ avant: stock + 1, apres: stock });

    // Un filtre désactive le glisser-déposer.
    await page
      .getByRole("combobox", { name: "Stock", exact: true })
      .selectOption({ label: "Épuisées" });
    await expect(page.getByText("Le glisser-déposer est désactivé")).toBeVisible();
    await expect(grille.getByRole("button", { name: /^Déplacer / })).toHaveCount(0);
  });

  test("photo : filigranée sur le site, original réservé au panel, image protégée", async ({
    page,
    request,
  }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/cards");
    await page.getByRole("button", { name: "Ajouter une carte" }).click();
    const ajout = page.getByRole("dialog", { name: "Ajouter une carte" });
    await ajout.getByLabel("Nom de la carte").fill(CARTE_E2E);
    await ajout.getByLabel("Prix ($)").fill("90");
    await ajout.getByLabel("Exemplaires en stock").fill("2");
    await ajout.getByLabel("Photo (facultative)").setInputFiles(PHOTO);
    await ajout.getByRole("button", { name: "Enregistrer la carte" }).click();
    await expect(ajout).toBeHidden();
    const [carte] = await sql<{ id: string; photo: string }>(
      `SELECT id, photo FROM "Carte" WHERE nom = $1 AND "supprimeLe" IS NULL`,
      [CARTE_E2E],
    );
    expect(carte.photo).toMatch(/^cartes\/.+\.jpg$/);

    // Hors session : l'original est refusé, la version publique est un WebP filigrané.
    expect((await request.get(`/api/fichiers/${carte.photo}`)).status()).toBe(401);
    const publique = await request.get(`/api/cartes/${carte.id}/photo`);
    expect(publique.status()).toBe(200);
    expect(publique.headers()["content-type"]).toBe("image/webp");
    const original = await readFile(PHOTO);
    expect(Buffer.compare(await publique.body(), original)).not.toBe(0);

    await page.goto("/cards");
    const article = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: CARTE_E2E }) });
    const image = article.getByRole("img", { name: `Carte ${CARTE_E2E}` });
    await expect(image).toHaveAttribute("src", /api%2Fcartes|api\/cartes/);
    await expect(image).toHaveAttribute("draggable", "false");
    // Un calque couvre l'image : le clic droit ne vise jamais l'<img>, et le menu est bloqué.
    const cible = await image.evaluate((img) => {
      const r = img.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.tagName;
    });
    expect(cible).not.toBe("IMG");
    const bloque = await image.evaluate((img) => {
      const e = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      img.parentElement!.dispatchEvent(e);
      return e.defaultPrevented;
    });
    expect(bloque).toBe(true);
    await unlink(path.resolve(process.env.STOCKAGE_DIR ?? "data", carte.photo));
  });

  test("droits : gestionnaire sans annulation, FISC en consultation", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    const modale = await vendre(page, "Mouette du port", 1);
    await modale.getByRole("button", { name: "Enregistrer la vente" }).click();
    await expect(modale).toBeHidden();
    await expect(page.getByRole("button", { name: /^Annuler la vente/ })).toHaveCount(0);

    await page.context().clearCookies();
    await page.goto("/admin/connexion");
    await page.getByRole("button", { name: /^Inspecteur Daniel Hart/ }).click();
    await expect(page).toHaveURL(/\/admin\/comptabilite$/);
    await page.goto("/admin/cards/ventes");
    await expect(page.getByRole("table", { name: "Ventes de cartes" })).toContainText(CLIENT);
    await expect(page.getByRole("button", { name: "Nouvelle vente" })).toHaveCount(0);
    await expect(page.getByText("Consultation seule.", { exact: false })).toBeVisible();
    await page.goto("/admin/cards");
    await expect(page).toHaveURL(/\/admin\/acces-refuse\?raison=role/);
  });

  test("accessibilité du panel Cards", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    for (const route of ["/admin/cards", "/admin/cards/ventes"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${route} ${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
    }
    await page.getByRole("button", { name: "Nouvelle vente" }).click();
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => v.id)).toEqual([]);
  });
});
