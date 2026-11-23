import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { connexion, sql } from "./outils";

const PREFIXE = "F3 e2e";
let auditsAvant: string[];
let filialeVisible: boolean;
let permisAvant: { id: string; visible: boolean }[];

test.beforeEach(async ({ page }) => {
  auditsAvant = (
    await sql<{ id: string }>(`SELECT id FROM "JournalAudit" WHERE action LIKE 'formation.%'`)
  ).map((r) => r.id);
  [{ visible: filialeVisible }] = await sql<{ visible: boolean }>(
    `SELECT visible FROM "Filiale" WHERE code='BPF'`,
  );
  permisAvant = await sql(
    `SELECT id, visible FROM "Permis" WHERE id IN ('licence-navigation','licence-pilotage')`,
  );
  await page.setExtraHTTPHeaders({
    "x-forwarded-for": `2001:db8::${randomBytes(2).toString("hex")}:${randomBytes(2).toString("hex")}`,
  });
});

test.afterEach(async () => {
  await sql(`DELETE FROM "DemandeContact" WHERE "nomRp" LIKE $1`, [`${PREFIXE}%`]);
  await sql(`DELETE FROM "Permis" WHERE nom LIKE $1`, [`${PREFIXE}%`]);
  await sql(`DELETE FROM "DomainePermis" WHERE nom LIKE $1`, [`${PREFIXE}%`]);
  await sql(
    `DELETE FROM "JournalAudit" WHERE action LIKE 'formation.%' AND NOT (id = ANY($1::text[]))`,
    [auditsAvant],
  );
  await sql(`UPDATE "Filiale" SET visible=$1 WHERE code='BPF'`, [filialeVisible]);
  for (const p of permisAvant)
    await sql(`UPDATE "Permis" SET visible=$2 WHERE id=$1`, [p.id, p.visible]);
});

async function remplir(page: Page, nom = `${PREFIXE} Contact`) {
  await page.getByLabel("Nom RP", { exact: true }).fill(nom);
  await page.getByLabel("Téléphone en jeu", { exact: true }).fill("555-0198");
  await page.getByLabel("Permis souhaité").selectOption("licence-navigation");
  await page
    .getByLabel("Votre message")
    .fill("Je souhaite préparer ma licence de navigation et organiser les épreuves.");
}

test("catalogue validé : deux licences à 4 000 $, modalités et header or", async ({ page }) => {
  await page.goto("/formation");
  await expect(
    page.getByRole("heading", { level: 1, name: "Black Pégasus Formation" }),
  ).toBeVisible();
  for (const nom of ["Licence navigation", "Licence pilotage"]) {
    const carte = page
      .getByRole("article")
      .filter({ has: page.getByRole("heading", { name: nom, exact: true }) });
    await expect(carte).toContainText("$4 000");
    await expect(carte).toContainText("Visite médicale");
    await expect(carte).toContainText("Questionnaire et test pratique");
    await expect(carte.getByText("Durée", { exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("banner").locator("[data-filiale]")).toHaveCount(0);
  const { violations } = await new AxeBuilder({ page }).analyze();
  expect(violations.map((v) => `${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
});

test("demande publique → cloche → traitement par le gestionnaire, historique conservé", async ({
  page,
}) => {
  const [{ n }] = await sql<{ n: number }>(
    `SELECT count(*)::int AS n FROM "DemandeContact" WHERE statut='NOUVELLE'`,
  );
  await page.goto("/formation");
  await remplir(page);
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByRole("status")).toContainText("Votre demande a été transmise");
  const [demande] = await sql<{ id: string; statut: string; permisId: string }>(
    `SELECT id,statut,"permisId" FROM "DemandeContact" WHERE "nomRp"=$1`,
    [`${PREFIXE} Contact`],
  );
  expect(demande.statut).toBe("NOUVELLE");
  expect(demande.permisId).toBe("licence-navigation");
  const [audit] = await sql<{ compteId: string | null; details: unknown }>(
    `SELECT "compteId", details FROM "JournalAudit" WHERE action='formation.demande' AND cible=$1`,
    [`DemandeContact:${demande.id}`],
  );
  expect(audit.compteId).toBeNull();
  expect(audit.details).toBeNull();
  await connexion(page, "Lena Castillo");
  await page.getByRole("button", { name: /Notifications/ }).click();
  await page.getByRole("link", { name: `${n + 1} demandes de formation`, exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/formation\/demandes$/);
  const tableau = page.getByRole("table", { name: "Demandes de formation" });
  const ligne = tableau.getByRole("row").filter({ hasText: `${PREFIXE} Contact` });
  await expect(ligne).toContainText("555-0198");
  await expect(ligne).toContainText("Licence navigation");
  await ligne.getByRole("button", { name: /Marquer traitée/ }).click();
  await expect(ligne).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Statut des demandes" })
    .getByRole("link", { name: "Toutes", exact: true })
    .click();
  const traitee = tableau.getByRole("row").filter({ hasText: `${PREFIXE} Contact` });
  await expect(traitee).toContainText("Traitée");
  await expect(traitee).toContainText("Lena Castillo");
  await page.getByRole("button", { name: /Notifications/ }).click();
  await expect(
    page.getByRole("link", { name: `${n} demandes de formation`, exact: true }),
  ).toBeVisible();
  const [d] = await sql<{ statut: string; traiteeParId: string; traiteeLe: Date }>(
    `SELECT statut, "traiteeParId", "traiteeLe" FROM "DemandeContact" WHERE id=$1`,
    [demande.id],
  );
  expect(d.statut).toBe("TRAITEE");
  expect(d.traiteeParId).toBeTruthy();
  expect(d.traiteeLe).toBeTruthy();
  await page.getByRole("button", { name: "Déconnexion", exact: true }).click();
  await expect(page).toHaveURL(/\/admin\/connexion$/);
  await connexion(page, "Vincent Moretti");
  await page.goto("/admin/comptes");
  await expect(page.getByText("Site public", { exact: true }).first()).toBeVisible();
});

test("cinq tentatives par IP : piège anti-robot silencieux puis sixième envoi refusé", async ({
  page,
}) => {
  await page.goto("/formation");
  for (let i = 0; i < 5; i++) {
    await remplir(page, `${PREFIXE} Quota ${i}`);
    if (i === 0)
      await page.locator('input[name="siteWeb"]').evaluate((e) => {
        (e as HTMLInputElement).value = "robot";
      });
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page.getByRole("status")).toContainText("Votre demande a été transmise");
  }
  await remplir(page, `${PREFIXE} Quota refusée`);
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(
    page.getByRole("form", { name: "Demande de formation" }).getByRole("alert"),
  ).toContainText("Trop de demandes de formation");
  expect(
    await sql(`SELECT id FROM "DemandeContact" WHERE "nomRp" LIKE $1`, [`${PREFIXE} Quota%`]),
  ).toHaveLength(4);
});

test("validations serveur : téléphone, permis retiré et filiale masquée entre affichage et envoi", async ({
  page,
}) => {
  await page.goto("/formation");
  await remplir(page, `${PREFIXE} Validation`);
  // La saisie est mise en forme côté client : on force une valeur invalide pour tester le serveur.
  const tel = page.getByLabel("Téléphone en jeu", { exact: true });
  await tel.evaluate((e: HTMLInputElement) => {
    e.removeAttribute("pattern");
    e.removeAttribute("maxlength");
  });
  await tel.fill("5550123");
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(
    page.getByRole("form", { name: "Demande de formation" }).getByRole("alert"),
  ).toContainText("format 000-0000");
  await remplir(page, `${PREFIXE} Validation`);
  await sql(`UPDATE "Permis" SET visible=false WHERE id='licence-navigation'`);
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(
    page.getByRole("form", { name: "Demande de formation" }).getByRole("alert"),
  ).toContainText("Ce permis n’est plus proposé");
  await page.getByLabel("Permis souhaité").selectOption("");
  await sql(`UPDATE "Filiale" SET visible=false WHERE code='BPF'`);
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(
    page.getByRole("form", { name: "Demande de formation" }).getByRole("alert"),
  ).toContainText("formulaire de Formation est indisponible");
  expect(
    await sql(`SELECT id FROM "DemandeContact" WHERE "nomRp"=$1`, [`${PREFIXE} Validation`]),
  ).toHaveLength(0);
  await sql(`UPDATE "Filiale" SET visible=true WHERE code='BPF'`);
  await page.getByRole("button", { name: "Envoyer ma demande" }).click();
  await expect(page.getByRole("status")).toContainText("Votre demande a été transmise");
  const [generale] = await sql<{ permisId: string | null }>(
    `SELECT "permisId" FROM "DemandeContact" WHERE "nomRp"=$1`,
    [`${PREFIXE} Validation`],
  );
  expect(generale.permisId).toBeNull();
});

test("domaines et permis : ajout, modification, visibilité et suppression logique", async ({
  page,
}) => {
  await connexion(page, "Lena Castillo");
  await page.goto("/admin/formation/permis");
  await expect(
    page.getByRole("button", { name: "Supprimer le domaine Navigation", exact: true }),
  ).toBeDisabled();
  await page.getByLabel("Nouveau domaine", { exact: true }).fill(`${PREFIXE} Domaine`);
  await page.getByRole("button", { name: "Ajouter le domaine", exact: true }).click();
  await expect(page.getByLabel(`Nom du domaine ${PREFIXE} Domaine`, { exact: true })).toBeVisible();
  await page
    .getByLabel(`Nom du domaine ${PREFIXE} Domaine`, { exact: true })
    .fill(`${PREFIXE} Navigation`);
  await page
    .getByLabel(`Nom du domaine ${PREFIXE} Domaine`, { exact: true })
    .locator("xpath=ancestor::form")
    .getByRole("button", { name: "Enregistrer le domaine" })
    .click();
  await expect(
    page.getByLabel(`Nom du domaine ${PREFIXE} Navigation`, { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Ajouter un permis", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Ajouter un permis", exact: true });
  await modal.getByLabel("Nom du permis").fill(`${PREFIXE} Licence`);
  await modal.getByLabel("Domaine").selectOption({ label: `${PREFIXE} Navigation` });
  await modal
    .getByLabel("Description", { exact: true })
    .fill("Une formation de test pour vérifier le catalogue.");
  await modal.getByLabel("Tarif ($)", { exact: true }).fill("4500");
  await modal.getByLabel("Prérequis", { exact: true }).fill("Visite médicale");
  await modal.getByRole("button", { name: "Enregistrer le permis" }).click();
  await expect(modal).toBeHidden();
  const [p] = await sql<{ id: string; domaineId: string }>(
    `SELECT id,"domaineId" FROM "Permis" WHERE nom=$1`,
    [`${PREFIXE} Licence`],
  );
  await page.goto("/formation");
  await expect(
    page.getByRole("heading", { name: `${PREFIXE} Licence`, exact: true }),
  ).toBeVisible();
  await page.goto("/admin/formation/permis");
  await page.getByRole("button", { name: `Modifier ${PREFIXE} Licence`, exact: true }).click();
  const editer = page.getByRole("dialog", { name: `Modifier ${PREFIXE} Licence`, exact: true });
  await editer.getByLabel("Tarif ($)", { exact: true }).fill("4600");
  await editer.getByRole("switch", { name: "Visible sur le site" }).click();
  await editer.getByRole("button", { name: "Enregistrer le permis" }).click();
  await expect(editer).toBeHidden();
  await page.goto("/formation");
  await expect(page.getByRole("heading", { name: `${PREFIXE} Licence`, exact: true })).toHaveCount(
    0,
  );
  await sql(
    `INSERT INTO "DemandeContact" (id,"nomRp",telephone,"permisId",message) VALUES ('f3-e2e-archive',$1,'555-0198',$2,'Demande de test à conserver après archivage.')`,
    [`${PREFIXE} Archive`, p.id],
  );
  await page.goto("/admin/formation/permis");
  await page.getByRole("button", { name: `Supprimer ${PREFIXE} Licence`, exact: true }).click();
  await page
    .getByRole("dialog", { name: "Supprimer le permis", exact: true })
    .getByRole("button", { name: "Supprimer le permis", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: `${PREFIXE} Licence`, exact: true })).toHaveCount(
    0,
  );
  const [archive] = await sql<{ supprimeLe: Date; prix: number }>(
    `SELECT "supprimeLe",prix FROM "Permis" WHERE id=$1`,
    [p.id],
  );
  expect(archive.supprimeLe).toBeTruthy();
  expect(archive.prix).toBe(4600);
  await expect(
    page.getByRole("button", { name: `Supprimer le domaine ${PREFIXE} Navigation` }),
  ).toBeDisabled();
  await page.goto("/admin/formation/demandes");
  await expect(
    page
      .getByRole("table")
      .getByRole("row")
      .filter({ hasText: `${PREFIXE} Archive` }),
  ).toContainText(`${PREFIXE} Licence`);
  // Un domaine réellement inutilisé reste supprimable.
  await page.goto("/admin/formation/permis");
  await page.getByLabel("Nouveau domaine", { exact: true }).fill(`${PREFIXE} Vide`);
  await page.getByRole("button", { name: "Ajouter le domaine", exact: true }).click();
  await page.getByRole("button", { name: `Supprimer le domaine ${PREFIXE} Vide` }).click();
  await expect(page.getByLabel(`Nom du domaine ${PREFIXE} Vide`, { exact: true })).toHaveCount(0);
});

test("le FISC ne voit ni les demandes, ni la navigation Formation, ni la notification", async ({
  page,
}) => {
  await page.goto("/admin/connexion");
  await page.getByRole("button", { name: /^Inspecteur Daniel Hart/ }).click();
  await expect(page).toHaveURL(/\/admin\/comptabilite$/);
  const nav = page.getByRole("complementary", { name: "Navigation du panel" });
  await expect(nav.getByRole("link", { name: "Demandes", exact: true })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Permis", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: /Notifications/ }).click();
  await expect(page.getByRole("link", { name: /demandes? de formation/ })).toHaveCount(0);
  for (const chemin of ["/admin/formation/permis", "/admin/formation/demandes"]) {
    await page.goto(chemin);
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/admin\/acces-refuse\?raison=role/);
    await expect(page.getByText("Alex Morgan", { exact: true })).toHaveCount(0);
  }
});

test("accessibilité et responsive de Formation, des permis, de la modale et des demandes", async ({
  page,
}) => {
  await connexion(page, "Vincent Moretti");
  for (const route of ["/formation", "/admin/formation/permis", "/admin/formation/demandes"]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    for (const largeur of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width: largeur, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
        `${route} à ${largeur}`,
      ).toBeLessThanOrEqual(largeur);
    }
    const { violations } = await new AxeBuilder({ page }).analyze();
    expect(violations.map((v) => `${route} ${v.id} ${v.nodes[0]?.target}`)).toEqual([]);
    if (route.endsWith("/permis")) {
      await page.getByRole("button", { name: "Ajouter un permis", exact: true }).click();
      const { violations: modal } = await new AxeBuilder({ page }).analyze();
      expect(modal.map((v) => v.id)).toEqual([]);
      await page.keyboard.press("Escape");
    }
  }
});
