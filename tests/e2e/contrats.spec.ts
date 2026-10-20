import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { connexion, sql } from "./outils";

const CLIENT = "Elena Essai";
const NBSP = String.fromCharCode(0xa0);

// État du seed à restaurer après les essais (compteurs et exemplaire du Toro2).
let compteurContrats = 0;
let compteursSemaines: { id: string; compteurOperations: number }[] = [];

async function nettoyer() {
  const ids = (
    await sql<{ id: string }>(`SELECT id FROM "Contrat" WHERE "clientNom" = $1`, [CLIENT])
  ).map((c) => c.id);
  if (ids.length) {
    await sql(`DELETE FROM "Mouvement" WHERE "contratId" = ANY($1)`, [ids]);
    await sql(`DELETE FROM "Contrat" WHERE id = ANY($1)`, [ids]);
  }
  await sql(`UPDATE "Exemplaire" SET statut = 'DISPONIBLE' WHERE immatriculation = 'BP TR 01'`);
}

// Début dans le passé de l’horloge de démo (24/10 · 21:40) pour pouvoir clôturer en retard.
async function remplirToro2(page: Page, debut = "2026-10-24T09:00", fin = "2026-10-24T21:00") {
  await page.goto("/admin/contrats/nouveau");
  await page.getByLabel("Nom du client (RP)").fill(CLIENT);
  await page.getByLabel("Téléphone en jeu").fill("555-0148");
  await page.getByLabel("Modèle").selectOption({ label: "Toro2 · Vedette · $600/h" });
  await page.getByLabel("Début").fill(debut);
  await page
    .getByRole("group", { name: "Durée rapide" })
    .getByRole("button", { name: "12 h" })
    .click();
  await expect(page.getByLabel("Fin prévue")).toHaveValue(fin);
}

test.describe("contrats", () => {
  test.beforeAll(async () => {
    await nettoyer();
    compteurContrats = (
      await sql<{ valeur: number }>(`SELECT valeur FROM "Compteur" WHERE cle = 'CTR-2026'`)
    )[0].valeur;
    compteursSemaines = await sql(`SELECT id, "compteurOperations" FROM "Semaine"`);
  });
  test.afterAll(async () => {
    await nettoyer();
    await sql(`UPDATE "Compteur" SET valeur = $1 WHERE cle = 'CTR-2026'`, [compteurContrats]);
    for (const s of compteursSemaines)
      await sql(`UPDATE "Semaine" SET "compteurOperations" = $2 WHERE id = $1`, [
        s.id,
        s.compteurOperations,
      ]);
  });

  test("création → PDF → clôture avec 40 min de retard", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await remplirToro2(page);

    const recap = page.getByRole("complementary", { name: "Récapitulatif" });
    await expect(recap).toContainText(`$3${NBSP}600`);
    await expect(recap).toContainText(`$5${NBSP}000`);
    await expect(recap).toContainText(`$8${NBSP}600`);
    await expect(recap).toContainText("Tarif journalier appliqué");

    await page.getByRole("button", { name: "Créer le contrat et générer le PDF" }).click();
    await expect(page).toHaveURL(/\/admin\/contrats\?cree=CTR-2026-/);
    const numero = new URL(page.url()).searchParams.get("cree")!;
    await expect(page.getByRole("status")).toContainText(`Contrat ${numero} créé`);

    const [contrat] = await sql<{ id: string; montantLocation: number; caution: number }>(
      `SELECT id, "montantLocation", caution FROM "Contrat" WHERE numero = $1`,
      [numero],
    );
    expect(contrat).toMatchObject({ montantLocation: 3600, caution: 5000 });
    const creation = await sql<{ categorie: string; montant: number }>(
      `SELECT categorie, montant FROM "Mouvement" WHERE "contratId" = $1 ORDER BY numero`,
      [contrat.id],
    );
    expect(creation).toEqual([
      { categorie: "CAUTION_ENCAISSEE", montant: 5000 },
      { categorie: "LOCATION", montant: 3600 },
    ]);

    const pdf = await page.request.get(`/admin/contrats/${contrat.id}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    await page.goto(`/admin/contrats/${contrat.id}/cloturer`);
    await page.getByLabel("Heure de retour réelle").fill("2026-10-24T21:40");
    const bilan = page.getByRole("complementary", { name: "Bilan de clôture" });
    await expect(page.getByText("Retard : 40 min")).toBeVisible();
    await expect(bilan).toContainText("$900");
    await page.getByRole("button", { name: "Clôturer le contrat" }).click();
    await expect(page).toHaveURL(/\/admin\/contrats$/);

    const cloture = await sql<{ categorie: string; montant: number; sens: string }>(
      `SELECT categorie, montant, sens FROM "Mouvement" WHERE "contratId" = $1 ORDER BY numero`,
      [contrat.id],
    );
    expect(cloture.slice(2)).toEqual([
      { categorie: "PENALITE", montant: 900, sens: "ENTREE" },
      { categorie: "CAUTION_RENDUE", montant: 5000, sens: "SORTIE" },
    ]);
    const [etat] = await sql<{ statut: string; retardMinutes: number; ex: string }>(
      `SELECT c.statut, c."retardMinutes", e.statut AS ex FROM "Contrat" c JOIN "Exemplaire" e ON e.id = c."exemplaireId" WHERE c.id = $1`,
      [contrat.id],
    );
    expect(etat).toEqual({ statut: "TERMINE", retardMinutes: 40, ex: "DISPONIBLE" });
  });

  test("deux créations simultanées sur le même exemplaire : une seule aboutit", async ({
    browser,
  }) => {
    const pages = await Promise.all(
      ["Vincent Moretti", "Lena Castillo"].map(async (nom) => {
        const page = await (await browser.newContext()).newPage();
        await connexion(page, nom);
        await remplirToro2(page);
        return page;
      }),
    );
    await Promise.all(
      pages.map((p) =>
        p.getByRole("button", { name: "Créer le contrat et générer le PDF" }).click(),
      ),
    );
    await expect
      .poll(async () => {
        const [ok, refus] = await Promise.all([
          Promise.all(pages.map((p) => p.url().includes("cree="))),
          Promise.all(pages.map((p) => p.getByText("Exemplaire déjà loué.").isVisible())),
        ]);
        return [ok.filter(Boolean).length, refus.filter(Boolean).length];
      })
      .toEqual([1, 1]);
    const crees = await sql(
      `SELECT id FROM "Contrat" WHERE "clientNom" = $1 AND statut = 'EN_COURS'`,
      [CLIENT],
    );
    expect(crees).toHaveLength(1);
  });

  test("accessibilité des écrans de contrats", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    const [{ id }] = await sql<{ id: string }>(
      `SELECT id FROM "Contrat" WHERE statut = 'EN_COURS' ORDER BY "finPrevue" LIMIT 1`,
    );
    for (const chemin of [
      "/admin/contrats",
      "/admin/contrats?onglet=termines",
      "/admin/contrats/nouveau",
      `/admin/contrats/${id}/cloturer`,
    ]) {
      await page.goto(chemin);
      await page.waitForLoadState("networkidle");
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${chemin} : ${v.id}`)).toEqual([]);
    }
  });

  test("un gestionnaire ne voit pas l’annulation de contrat", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    const [{ id }] = await sql<{ id: string }>(
      `SELECT id FROM "Contrat" WHERE statut = 'EN_COURS' LIMIT 1`,
    );
    await page.goto(`/admin/contrats/${id}/cloturer`);
    await expect(page.getByRole("button", { name: "Clôturer le contrat" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Annuler ce contrat/ })).toHaveCount(0);
  });
});
