"use server";

import { z } from "zod";
import { ErreurMetier } from "@/domaine/types";
import { lireImageEnvoyee } from "@/lib/fichiers";
import { exigerRole } from "@/lib/garde";
import { exigerQuotaEnvoi } from "@/lib/limites";
import { executer } from "@/lib/resultat";
import {
  ajusterStockCarte,
  annulerVente,
  creerVente,
  deplacerCarte,
  ordonnerCartes,
  ordonnerCategories,
  enregistrerCarte,
  enregistrerCategorie,
  supprimerCarte,
  supprimerCategorie,
} from "@/services/cards";

const id = z.string().trim().min(1, "Identifiant manquant.").max(100);
const nom = z
  .string()
  .trim()
  .min(2, "Nom : 2 caractères minimum.")
  .max(100, "Nom : 100 caractères maximum.");
const entier = (libelle: string, max: number) =>
  z.coerce
    .number({ error: `${libelle} : nombre attendu.` })
    .int(`${libelle} : nombre entier attendu.`)
    .min(0, `${libelle} : minimum 0.`)
    .max(max, `${libelle} : maximum ${max.toLocaleString("fr-FR")}.`);

const schemaCategorie = z.object({ nom });
const listeIds = z.array(id).max(5000);

const schemaCarte = z.object({
  categorieId: id,
  nom,
  prix: entier("Prix", 10_000_000),
  stock: entier("Stock", 100_000),
  visible: z.enum(["0", "1"]).transform((v) => v === "1"),
});

const schemaVente = z.object({
  lignes: z
    .array(
      z.object({
        carteId: id,
        quantite: z
          .number({ error: "Quantité : nombre attendu." })
          .int("Quantité : nombre entier attendu.")
          .min(1, "Quantité : minimum 1.")
          .max(1000, "Quantité : maximum 1 000."),
      }),
    )
    .min(1, "Ajoutez au moins une carte à la vente.")
    .max(50, "50 cartes différentes au maximum par vente."),
  montantEncaisse: z
    .number({ error: "Montant encaissé : nombre attendu." })
    .int("Montant encaissé : nombre entier de dollars.")
    .nullable(),
  clientNom: z
    .string()
    .trim()
    .min(2, "Nom du client : 2 caractères minimum.")
    .max(80, "Nom du client : 80 caractères maximum."),
  clientTelephone: z
    .string()
    .trim()
    .max(20, "Téléphone : 20 caractères maximum.")
    .transform((t) => t || null),
});

export async function actionEnregistrerCategorie(cible: unknown, donnees: unknown) {
  return executer(async () =>
    enregistrerCategorie(
      await exigerRole("cards.gerer"),
      id.nullable().parse(cible),
      schemaCategorie.parse(donnees),
    ),
  );
}

export async function actionSupprimerCategorie(cible: unknown) {
  return executer(async () => supprimerCategorie(await exigerRole("cards.gerer"), id.parse(cible)));
}

/** Carte : champs du formulaire, `photo` facultative, `retirerPhoto=1` pour le visuel par défaut. */
export async function actionEnregistrerCarte(formulaire: FormData) {
  return executer(async () => {
    const acteur = await exigerRole("cards.gerer");
    const cible = id.nullable().parse(formulaire.get("id") || null);
    const donnees = schemaCarte.parse(Object.fromEntries(formulaire));
    let photo = undefined;
    if (formulaire.get("retirerPhoto") === "1") photo = null;
    else {
      const fichier = formulaire.get("photo");
      if (fichier instanceof File && fichier.size > 0) {
        exigerQuotaEnvoi(acteur.id);
        photo = await lireImageEnvoyee(fichier);
        if (!photo) throw new ErreurMetier("Photo illisible.");
      }
    }
    return enregistrerCarte(acteur, cible, donnees, photo);
  });
}

export async function actionSupprimerCarte(cible: unknown) {
  return executer(async () => supprimerCarte(await exigerRole("cards.gerer"), id.parse(cible)));
}

export async function actionOrdonnerCategories(ids: unknown) {
  return executer(async () =>
    ordonnerCategories(await exigerRole("cards.gerer"), listeIds.parse(ids)),
  );
}

export async function actionOrdonnerCartes(categorieId: unknown, ids: unknown) {
  return executer(async () =>
    ordonnerCartes(await exigerRole("cards.gerer"), id.parse(categorieId), listeIds.parse(ids)),
  );
}

export async function actionDeplacerCarte(carteId: unknown, categorieId: unknown) {
  return executer(async () =>
    deplacerCarte(await exigerRole("cards.gerer"), id.parse(carteId), id.parse(categorieId)),
  );
}

export async function actionAjusterStock(carteId: unknown, delta: unknown) {
  return executer(async () =>
    ajusterStockCarte(
      await exigerRole("cards.gerer"),
      id.parse(carteId),
      z.number().int().min(-1000).max(1000).parse(delta),
    ),
  );
}

export async function actionCreerVente(donnees: unknown) {
  return executer(async () => {
    const vente = await creerVente(await exigerRole("vente.creer"), schemaVente.parse(donnees));
    return { numero: vente.numero };
  });
}

export async function actionAnnulerVente(cible: unknown) {
  return executer(async () => annulerVente(await exigerRole("vente.annuler"), id.parse(cible)));
}
