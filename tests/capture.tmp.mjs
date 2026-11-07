import { chromium } from "@playwright/test";
const [dossier, ...urls] = process.argv.slice(2);
const b = await chromium.launch();
const page = await (await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" })).newPage();
const erreurs = [];
page.on("pageerror", (e) => erreurs.push(e.message));
page.on("console", (m) => m.type() === "error" && erreurs.push(m.text().slice(0, 200)));
await page.goto("http://localhost:3000/admin/connexion");
await page.getByRole("button", { name: /^Vincent Moretti/ }).click();
await page.waitForURL((u) => !u.pathname.includes("connexion"));
for (const [i, u] of urls.entries()) {
  await page.goto("http://localhost:3000" + u, { waitUntil: "networkidle" });
  await page.screenshot({ path: `${dossier}/a${i}.png`, fullPage: true });
  console.log(i, u, await page.title());
}
console.log("erreurs", JSON.stringify(erreurs.slice(0, 3)));
await b.close();
