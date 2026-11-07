import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { z } from "zod";
import { disponibilite, type Disponibilite } from "@/domaine/disponibilite";
import type { VehiculeFlotte } from "@/domaine/flotte";
import type { ContexteTextes } from "@/domaine/textes";
import { prisma } from "@/lib/prisma";
import { urlPhoto } from "./stockage";

// Lectures du site public (lecture seule). Toujours à la requête : la disponibilité
// affichée est celle de la base, sans redéploiement.

const schemaForfaits = z.array(z.object({ libelle: z.string(), montant: z.number().int().min(0) }));
const schemaTextes = z.object({
  accroche: z.object({ titre: z.string(), texte: z.string() }),
  etapes: z.array(z.object({ titre: z.string(), texte: z.string() })),
  maison: z.object({ titre: z.string(), texte: z.string(), points: z.array(z.string()) }),
});
const schemaReglement = z.object({
  dateMiseAJour: z.string().nullable(),
  introduction: z.string(),
  articles: z.array(z.object({ titre: z.string(), contenu: z.string() })),
});

/** Photos des cartes « Trois éléments » de l'accueil, par type (clés de stockage). */
export const schemaPhotosAccueil = z
  .object({
    BATEAU: z.string().optional(),
    AVION: z.string().optional(),
    HELICOPTERE: z.string().optional(),
  })
  .catch({});

export type TextesSite = z.infer<typeof schemaTextes>;
export type PhotosAccueil = z.infer<typeof schemaPhotosAccueil>;
export type Reglement = z.infer<typeof schemaReglement>;

export type ParametresSite = ContexteTextes & {
  nomEntreprise: string;
  fuseauServeur: string;
  textesSite: TextesSite;
  reglement: Reglement;
  photosAccueil: PhotosAccueil;
};

/** Dédupliqué par requête (en-tête, page et pied de page le lisent). */
export const lireParametresSite = cache(async (): Promise<ParametresSite> => {
  await connection();
  const [p, bpl] = await Promise.all([
    prisma.parametres.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.filiale.findUniqueOrThrow({ where: { code: "BPL" } }),
  ]);
  return {
    nomEntreprise: p.nomEntreprise,
    fuseauServeur: p.fuseauServeur,
    // Site actuel = section Location : son contact (F-2 introduit l'accueil du groupe).
    telephone: bpl.telephone,
    horaires: bpl.horaires,
    toleranceRetardMin: p.toleranceRetardMin,
    majorationRetard: p.majorationRetard,
    seuilDefautRestitutionMin: p.seuilDefautRestitutionMin,
    forfaitsDegats: schemaForfaits.parse(p.forfaitsDegats),
    textesSite: schemaTextes.parse(p.textesSite),
    reglement: schemaReglement.parse(p.reglement),
    photosAccueil: schemaPhotosAccueil.parse(p.photosAccueil),
  };
});

export type VehiculeSite = VehiculeFlotte & {
  id: string;
  prixJour: number;
  caution: number;
  description: string;
  photoUrl: string;
  galerieUrls: string[];
  disponibilite: Disponibilite;
};

/** Véhicules visibles sur le site et non supprimés, avec leur disponibilité réelle. */
export const lireFlotteVisible = cache(async (): Promise<VehiculeSite[]> => {
  await connection();
  const vehicules = await prisma.vehicule.findMany({
    where: { visibleSurSite: true, supprimeLe: null },
    include: { categorie: true, exemplaires: { select: { statut: true } } },
    orderBy: [{ type: "asc" }, { categorie: { ordre: "asc" } }, { prixHeure: "asc" }],
  });
  return vehicules.map((v) => ({
    id: v.id,
    slug: v.slug,
    nom: v.nom,
    type: v.type,
    categorie: v.categorie.nom,
    ordreCategorie: v.categorie.ordre,
    places: v.places,
    contenanceKg: v.contenanceKg,
    prixHeure: v.prixHeure,
    prixJour: v.prixJour,
    caution: v.caution,
    description: v.description,
    photoUrl: urlPhoto(v.photo),
    galerieUrls: v.galerie.map((cle) => urlPhoto(cle)),
    exemplaires: v.exemplaires,
    disponibilite: disponibilite(v.exemplaires),
  }));
});
