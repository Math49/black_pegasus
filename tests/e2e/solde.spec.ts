import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { connexion, sql } from "./outils";

const MOTIF = "Essai e2e : révision des rotors";
const PHOTO = "public/images/vehicule-placeholder.jpg";

let compteurs: { id: string; compteurOperations: number; compteurJustificatifs: number }[] = [];

async function nettoyer() {
  // Contre-passations d'abord (clé étrangère vers le mouvement annulé).
  await sql(
    `DELETE FROM "Mouvement" WHERE "annuleMouvementId" IN (SELECT id FROM "Mouvement" WHERE motif LIKE 'Essai e2e%')`,
  );
  await sql(
    `DELETE FROM "Mouvement" WHERE motif LIKE 'Essai e2e%' OR motif LIKE 'Annulation de OP-43-03%'`,
  );
}

async function ouvrirSaisie(page: Page) {
  await page.goto("/admin/solde");
  await page.getByRole("button", { name: "Nouveau mouvement" }).click();
  return page.getByRole("dialog", { name: "Nouveau mouvement" });
}

test.describe("solde et mouvements", () => {
  test.beforeAll(async () => {
    await nettoyer();
    compteurs = await sql(
      `SELECT id, "compteurOperations", "compteurJustificatifs" FROM "Semaine"`,
    );
  });
  test.afterAll(async () => {
    await nettoyer();
    for (const s of compteurs)
      await sql(
        `UPDATE "Semaine" SET "compteurOperations" = $2, "compteurJustificatifs" = $3 WHERE id = $1`,
        [s.id, s.compteurOperations, s.compteurJustificatifs],
      );
  });

  test("solde, cartes et courbe de la semaine 43", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/solde");
    const haut = page.getByRole("region", { name: "Solde actuel" });
    await expect(haut).toContainText("$514 630".replace(" ", " "));
    await expect(haut).toContainText("+24,8");
    await expect(haut).toContainText("+$167 400");
    await expect(haut).toContainText("−$65 150");
    await expect(
      page.getByRole("img", { name: /ouverture \$412.380.*samedi \$514.630/ }),
    ).toBeVisible();
    await expect(page.getByText("1–15 sur 35 mouvements")).toBeVisible();
  });

  test("filtres et pagination de l’historique", async ({ page }) => {
    await connexion(page, "Lena Castillo");
    await page.goto("/admin/solde");
    await page.getByRole("searchbox", { name: "Rechercher un mouvement" }).fill("kerosene");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/q=kerosene/);
    const tableau = page.getByRole("table", { name: "Historique des mouvements" });
    await expect(tableau.getByRole("row")).toHaveCount(2);
    await expect(tableau).toContainText("Plein de kérosène du Luxor");

    await page.goto("/admin/solde?page=3");
    await expect(page.getByText("31–35 sur 35 mouvements")).toBeVisible();
    await page
      .getByRole("combobox", { name: "Catégorie" })
      .selectOption({ label: "Caution rendue" });
    await expect(page).toHaveURL(/categorie=CAUTION_RENDUE/);
    await expect(page).not.toHaveURL(/page=/);
  });

  test("dépense : justificatif obligatoire, numéros continus, justificatif privé", async ({
    page,
    browser,
  }) => {
    await connexion(page, "Lena Castillo");
    const modale = await ouvrirSaisie(page);
    await modale.getByLabel("Montant").fill("2400");
    await modale.getByLabel("Motif").fill(MOTIF);
    await modale.getByLabel("Date et heure").fill("2026-10-24T21:30");
    await modale.getByRole("button", { name: "Enregistrer le mouvement" }).click();
    await expect(modale.getByRole("alert")).toContainText("cette catégorie l’exige");

    await modale.locator('input[type="file"]').setInputFiles(PHOTO);
    await expect(modale.getByRole("img", { name: "Aperçu du justificatif" })).toBeVisible();
    await modale.getByRole("button", { name: "Enregistrer le mouvement" }).click();
    await expect(page.getByRole("status")).toContainText("OP-43-036 enregistré");

    const [m] = await sql<{
      numero: string;
      justificatifNumero: string;
      justificatif: string;
      montant: number;
    }>(
      `SELECT numero, "justificatifNumero", justificatif, montant FROM "Mouvement" WHERE motif = $1`,
      [MOTIF],
    );
    expect(m).toMatchObject({
      numero: "2026-OP-43-036",
      justificatifNumero: "JUST-43-06",
      montant: 2400,
    });

    // Justificatif servi aux sessions valides uniquement.
    expect((await page.request.get(`/api/fichiers/${m.justificatif}`)).status()).toBe(200);
    const anonyme = await browser.newContext();
    expect((await anonyme.request.get(`/api/fichiers/${m.justificatif}`)).status()).toBe(401);
    await anonyme.close();

    // Correction : seul le motif change, aucun champ de montant.
    await page.getByRole("button", { name: "Détail de OP-43-036" }).click();
    const fiche = page.getByRole("dialog", { name: "Détail du mouvement" });
    await expect(fiche.getByLabel("Montant")).toHaveCount(0);
    await fiche.getByLabel("Motif").fill(`${MOTIF} (corrigé)`);
    await fiche.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByRole("status")).toContainText("OP-43-036 corrigé");
    const [apres] = await sql<{ montant: number; sens: string }>(
      `SELECT montant, sens FROM "Mouvement" WHERE numero = '2026-OP-43-036'`,
    );
    expect(apres).toEqual({ montant: 2400, sens: "SORTIE" });
    // Un gestionnaire ne contre-passe pas.
    await page.getByRole("button", { name: "Détail de OP-43-036" }).click();
    await expect(page.getByRole("button", { name: "Contre-passer" })).toHaveCount(0);
  });

  test("contre-passation par un administrateur ; mouvement de contrat verrouillé", async ({
    page,
  }) => {
    await connexion(page, "Vincent Moretti");
    const modale = await ouvrirSaisie(page);
    await modale.getByText("Entrée", { exact: true }).click();
    await modale.getByLabel("Catégorie").selectOption({ label: "Apport" });
    await modale.getByLabel("Montant").fill("1 000");
    await modale.getByLabel("Motif").fill("Essai e2e : apport du gérant");
    await modale.getByRole("button", { name: "Enregistrer le mouvement" }).click();
    const status = page.getByRole("status");
    await expect(status).toContainText("enregistré");
    const numero = (await status.textContent())!.match(/OP-43-\d{3}/)![0];

    await page.getByRole("button", { name: `Détail de ${numero}` }).click();
    await page.getByRole("button", { name: "Contre-passer", exact: true }).click();
    await page.getByRole("button", { name: `Contre-passer ${numero}` }).click();
    await expect(status).toContainText(`${numero} contre-passé`);

    const lignes = await sql<{ sens: string; montant: number; motif: string }>(
      `SELECT sens, montant, motif FROM "Mouvement" WHERE motif = 'Essai e2e : apport du gérant' OR motif = $1 ORDER BY numero`,
      [`Annulation de ${numero}`],
    );
    expect(lignes).toEqual([
      { sens: "ENTREE", montant: 1000, motif: "Essai e2e : apport du gérant" },
      { sens: "SORTIE", montant: 1000, motif: `Annulation de ${numero}` },
    ]);
    await expect(page.getByText(`Annulé par`).first()).toBeVisible();

    await page.goto("/admin/solde");
    await page.getByRole("button", { name: "Détail de OP-43-035" }).click();
    const fiche = page.getByRole("dialog", { name: "Détail du mouvement" });
    await expect(fiche).toContainText("Mouvement généré par un contrat ou une vente");
    await expect(fiche.getByRole("button", { name: "Contre-passer" })).toHaveCount(0);
  });

  test("accessibilité de la page Solde et des modales", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/solde");
    await page.waitForLoadState("networkidle");
    const verifier = async (etape: string) => {
      const { violations } = await new AxeBuilder({ page }).analyze();
      expect(violations.map((v) => `${etape} : ${v.id}`)).toEqual([]);
    };
    await verifier("page");
    await page.getByRole("button", { name: "Nouveau mouvement" }).click();
    await verifier("saisie");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Détail de OP-43-027" }).click();
    await verifier("détail");
  });
});

test.describe("filiales dans la saisie", () => {
  test.afterAll(async () => {
    // Le compteur de la semaine revient en arrière : la numérotation reste sans trou.
    await sql(
      `UPDATE "Semaine" s SET "compteurOperations" = s."compteurOperations" - 1
       FROM "Mouvement" m WHERE m."semaineId" = s.id AND m.motif = 'Essai e2e : vente de cartes'`,
    );
    await sql(`DELETE FROM "Mouvement" WHERE motif = 'Essai e2e : vente de cartes'`);
  });

  test("la catégorie impose la filiale ; le mouvement la porte", async ({ page }) => {
    await connexion(page, "Vincent Moretti");
    await page.goto("/admin/solde");
    await page.getByRole("button", { name: "Nouveau mouvement" }).click();
    const modale = page.getByRole("dialog", { name: "Nouveau mouvement" });
    await expect(modale.getByLabel("Filiale")).toHaveValue("BPL"); // Entretien → Location
    await modale.getByText("Entrée", { exact: true }).click();
    await modale.getByLabel("Catégorie").selectOption({ label: "Vente de cartes" });
    await expect(modale.getByLabel("Filiale")).toHaveValue("BPC");
    await expect(modale.getByLabel("Filiale")).toBeDisabled();
    await modale.getByLabel("Montant").fill("450");
    await modale.getByLabel("Motif").fill("Essai e2e : vente de cartes");
    await modale.getByRole("button", { name: "Enregistrer le mouvement" }).click();
    await expect(page.getByRole("status")).toContainText("enregistré");
    const [m] = await sql<{ filiale: string; categorie: string }>(
      `SELECT filiale, categorie FROM "Mouvement" WHERE motif = 'Essai e2e : vente de cartes'`,
    );
    expect(m).toEqual({ filiale: "BPC", categorie: "VENTE_CARTES" });
  });
});
