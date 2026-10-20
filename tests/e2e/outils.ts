import { expect, type Page } from "@playwright/test";
import "dotenv/config";
import { Client } from "pg";

/** Requête SQL directe sur la base de développement (préparation et vérification des tests). */
export async function sql<T>(requete: string, valeurs: unknown[] = []): Promise<T[]> {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    return (await client.query(requete, valeurs)).rows as T[];
  } finally {
    await client.end();
  }
}

/** Connexion de développement avec un compte du seed (nom affiché). */
export async function connexion(page: Page, nom: string) {
  await page.goto("/admin/connexion");
  await page.getByRole("button", { name: new RegExp(`^${nom}`) }).click();
  await expect(page).toHaveURL(/\/admin(\/acces-refuse)?$/);
}
