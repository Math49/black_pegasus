"use server";

import { z } from "zod";
import { verifierImage, detecterTypeImage } from "@/lib/fichiers";
import { exigerRole } from "@/lib/garde";
import { executer } from "@/lib/resultat";
import {
  changerVisibilite,
  enregistrerVehicule,
  supprimerVehicule,
  type PhotoEnvoyee,
} from "@/services/vehicules";
import { ErreurMetier } from "@/domaine/types";

const entier = (libelle: string, min: number, max: number) =>
  z.coerce
    .number({ message: `${libelle} : nombre attendu.` })
    .int(`${libelle} : nombre entier attendu.`)
    .min(min, `${libelle} : minimum ${min}.`)
    .max(max, `${libelle} : maximum ${max}.`);

const schemaVehicule = z.object({
  nom: z
    .string()
    .trim()
    .min(2, "Nom du véhicule : 2 caractères minimum.")
    .max(60, "Nom trop long."),
  type: z.enum(["BATEAU", "AVION", "HELICOPTERE"], { message: "Type invalide." }),
  categorieId: z.string().min(1, "Choisissez une catégorie."),
  places: entier("Places", 1, 100),
  contenanceKg: entier("Contenance", 0, 100_000),
  prixHeure: entier("Prix à l’heure", 1, 10_000_000),
  prixJour: entier("Prix à la journée", 1, 100_000_000),
  caution: entier("Caution", 0, 100_000_000),
  description: z.string().max(4000, "Présentation trop longue.").default(""),
  visibleSurSite: z.boolean(),
  exemplaires: z
    .array(
      z.object({
        id: z.string().optional(),
        immatriculation: z.string(),
        statut: z.enum(["DISPONIBLE", "LOUE", "MAINTENANCE"]),
        note: z.string().max(120, "Détail d’exemplaire trop long.").default(""),
      }),
    )
    .min(1, "Ajoutez au moins un exemplaire."),
});

async function lirePhoto(fichier: FormDataEntryValue | null): Promise<PhotoEnvoyee | null> {
  if (!(fichier instanceof File) || fichier.size === 0) return null;
  const octets = new Uint8Array(await fichier.arrayBuffer());
  const erreur = verifierImage(octets);
  if (erreur) throw new ErreurMetier(erreur);
  return { octets, extension: detecterTypeImage(octets)!.extension };
}

/** Formulaire véhicule (maquette 15) : données en JSON + photo facultative. */
export async function actionEnregistrerVehicule(formulaire: FormData) {
  return executer(async () => {
    const id = String(formulaire.get("id") ?? "") || null;
    const acteur = await exigerRole(id ? "vehicule.modifier" : "vehicule.creer");
    const donnees = schemaVehicule.parse(JSON.parse(String(formulaire.get("donnees") ?? "{}")));
    const photo = await lirePhoto(formulaire.get("photo"));
    return enregistrerVehicule(acteur, id, donnees, photo);
  });
}

export async function actionChangerVisibilite(id: string, visible: boolean) {
  return executer(async () => {
    const acteur = await exigerRole("vehicule.modifier");
    await changerVisibilite(acteur, z.string().min(1).parse(id), z.boolean().parse(visible));
  });
}

export async function actionSupprimerVehicule(id: string) {
  return executer(async () => {
    const acteur = await exigerRole("vehicule.supprimer");
    await supprimerVehicule(acteur, z.string().min(1).parse(id));
  });
}
