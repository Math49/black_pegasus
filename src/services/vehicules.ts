import "server-only";
import { revalidatePath } from "next/cache";
import { ErreurMetier, type StatutExemplaire, type TypeVehicule } from "@/domaine/types";
import {
  normaliserImmatriculation,
  slugifier,
  slugUnique,
  verifierExemplaires,
} from "@/domaine/vehicules";
import type { CompteConnecte } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { enTransaction } from "@/lib/transaction";
import { journaliser } from "./audit";
import { enregistrerFichier, supprimerFichier } from "./stockage";

export type DonneesVehicule = {
  nom: string;
  type: TypeVehicule;
  categorieId: string;
  places: number;
  contenanceKg: number;
  prixHeure: number;
  prixJour: number;
  caution: number;
  description: string;
  visibleSurSite: boolean;
  exemplaires: { id?: string; immatriculation: string; statut: StatutExemplaire; note: string }[];
};

export type PhotoEnvoyee = { octets: Uint8Array; extension: string };

/** Le site public lit la base à chaque requête ; on invalide tout de même ses routes. */
function revaliderSite(slug?: string) {
  revalidatePath("/");
  revalidatePath("/location");
  revalidatePath("/location/flotte");
  if (slug) revalidatePath(`/location/flotte/${slug}`);
  revalidatePath("/admin/vehicules");
}

function traduireErreur(e: unknown): never {
  if ((e as { code?: string }).code === "P2002") {
    throw new ErreurMetier("Cette immatriculation est déjà utilisée par un autre exemplaire.");
  }
  throw e;
}

export async function enregistrerVehicule(
  acteur: CompteConnecte,
  id: string | null,
  d: DonneesVehicule,
  photo: PhotoEnvoyee | null,
) {
  const erreurExemplaires = verifierExemplaires(d.exemplaires.map((e) => e.immatriculation));
  if (erreurExemplaires) throw new ErreurMetier(erreurExemplaires);
  if (d.exemplaires.some((e) => !e.id && e.statut === "LOUE")) {
    throw new ErreurMetier("Le statut « Loué » est posé par un contrat, pas à la main.");
  }
  const cleNouvellePhoto = photo
    ? await enregistrerFichier("photos", photo.octets, photo.extension)
    : null;

  try {
    const resultat = await enTransaction(async (tx) => {
      const categorie = await tx.categorie.findUnique({ where: { id: d.categorieId } });
      if (!categorie || categorie.type !== d.type) {
        throw new ErreurMetier("Choisissez une catégorie de ce type de véhicule.");
      }
      const champs = {
        nom: d.nom.trim(),
        type: d.type,
        categorieId: d.categorieId,
        places: d.places,
        contenanceKg: d.contenanceKg,
        prixHeure: d.prixHeure,
        prixJour: d.prixJour,
        caution: d.caution,
        description: d.description.trim(),
        visibleSurSite: d.visibleSurSite,
        modifieParId: acteur.id,
        ...(cleNouvellePhoto && { photo: cleNouvellePhoto }),
      };

      if (!id) {
        const slugs = new Set(
          (await tx.vehicule.findMany({ select: { slug: true } })).map((v) => v.slug),
        );
        const vehicule = await tx.vehicule.create({
          data: {
            ...champs,
            slug: slugUnique(slugifier(d.nom), slugs),
            exemplaires: {
              create: d.exemplaires.map((e) => ({
                immatriculation: normaliserImmatriculation(e.immatriculation),
                statut: e.statut,
                note: e.note.trim() || null,
              })),
            },
          },
        });
        await journaliser(tx, {
          compteId: acteur.id,
          action: "vehicule.creer",
          cible: `Vehicule:${vehicule.slug}`,
          details: { nom: vehicule.nom, exemplaires: d.exemplaires.length },
        });
        return { slug: vehicule.slug, id: vehicule.id, anciennePhoto: null as string | null };
      }

      const existant = await tx.vehicule.findUnique({
        where: { id },
        include: { exemplaires: { include: { _count: { select: { contrats: true } } } } },
      });
      if (!existant || existant.supprimeLe) throw new ErreurMetier("Véhicule introuvable.");

      const conserves = new Set(d.exemplaires.filter((e) => e.id).map((e) => e.id));
      for (const ex of existant.exemplaires.filter((e) => !conserves.has(e.id))) {
        if (ex._count.contrats > 0 || ex.statut === "LOUE") {
          throw new ErreurMetier(
            `${ex.immatriculation} a déjà été loué : il ne peut pas être supprimé (passez-le en maintenance).`,
          );
        }
        await tx.exemplaire.delete({ where: { id: ex.id } });
      }
      for (const e of d.exemplaires) {
        const immatriculation = normaliserImmatriculation(e.immatriculation);
        const note = e.note.trim() || null;
        if (!e.id) {
          await tx.exemplaire.create({
            data: { vehiculeId: id, immatriculation, statut: e.statut, note },
          });
          continue;
        }
        const avant = existant.exemplaires.find((x) => x.id === e.id);
        if (!avant) throw new ErreurMetier("Exemplaire introuvable.");
        if (avant.statut === "LOUE" && e.statut !== "LOUE") {
          throw new ErreurMetier(
            `${avant.immatriculation} est loué : son statut changera à la clôture du contrat.`,
          );
        }
        if (avant.statut !== "LOUE" && e.statut === "LOUE") {
          throw new ErreurMetier("Le statut « Loué » est posé par un contrat, pas à la main.");
        }
        if (avant._count.contrats > 0 && immatriculation !== avant.immatriculation) {
          throw new ErreurMetier(
            `${avant.immatriculation} figure sur des contrats : son immatriculation ne peut plus changer.`,
          );
        }
        await tx.exemplaire.update({
          where: { id: e.id },
          data: { immatriculation, statut: e.statut, note },
        });
      }

      await tx.vehicule.update({ where: { id }, data: champs });
      await journaliser(tx, {
        compteId: acteur.id,
        action: "vehicule.modifier",
        cible: `Vehicule:${existant.slug}`,
        details: { nom: champs.nom },
      });
      return { slug: existant.slug, id, anciennePhoto: cleNouvellePhoto ? existant.photo : null };
    });

    // L'ancienne photo n'est effacée que si plus aucun véhicule ne l'utilise (photo provisoire partagée).
    if (
      resultat.anciennePhoto &&
      (await prisma.vehicule.count({ where: { photo: resultat.anciennePhoto } })) === 0
    ) {
      await supprimerFichier(resultat.anciennePhoto);
    }
    revaliderSite(resultat.slug);
    return resultat;
  } catch (e) {
    if (cleNouvellePhoto) await supprimerFichier(cleNouvellePhoto);
    traduireErreur(e);
  }
}

export async function changerVisibilite(acteur: CompteConnecte, id: string, visible: boolean) {
  const slug = await enTransaction(async (tx) => {
    const v = await tx.vehicule.update({
      where: { id, supprimeLe: null },
      data: { visibleSurSite: visible, modifieParId: acteur.id },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: visible ? "vehicule.afficher" : "vehicule.masquer",
      cible: `Vehicule:${v.slug}`,
      details: { nom: v.nom },
    });
    return v.slug;
  });
  revaliderSite(slug);
}

/** Suppression logique (administrateur) : l'historique des contrats reste lisible. */
export async function supprimerVehicule(acteur: CompteConnecte, id: string) {
  const slug = await enTransaction(async (tx) => {
    const v = await tx.vehicule.findUnique({ where: { id }, include: { exemplaires: true } });
    if (!v || v.supprimeLe) throw new ErreurMetier("Véhicule introuvable.");
    if (v.exemplaires.some((e) => e.statut === "LOUE")) {
      throw new ErreurMetier(
        "Un exemplaire est loué : clôturez le contrat avant de supprimer le véhicule.",
      );
    }
    await tx.vehicule.update({
      where: { id },
      data: { supprimeLe: new Date(), visibleSurSite: false, modifieParId: acteur.id },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "vehicule.supprimer",
      cible: `Vehicule:${v.slug}`,
      details: { nom: v.nom },
    });
    return v.slug;
  });
  revaliderSite(slug);
}

// ── Lectures ────────────────────────────────────────────────────────────────

const inclureExemplaires = {
  exemplaires: {
    orderBy: { immatriculation: "asc" as const },
    include: {
      _count: { select: { contrats: true } },
      contrats: {
        where: { statut: "EN_COURS" as const },
        select: { numero: true, clientNom: true },
        take: 1,
      },
    },
  },
} as const;

export async function lireVehiculesAdmin() {
  return prisma.vehicule.findMany({
    where: { supprimeLe: null },
    include: { categorie: true, ...inclureExemplaires },
    orderBy: [{ type: "asc" }, { categorie: { ordre: "asc" } }, { prixHeure: "asc" }],
  });
}

export async function lireVehiculeAdmin(id: string) {
  return prisma.vehicule.findFirst({
    where: { id, supprimeLe: null },
    include: {
      categorie: true,
      modifiePar: { select: { nomRp: true, nomAffiche: true, pseudo: true, discordId: true } },
      ...inclureExemplaires,
    },
  });
}

export async function lireCategories() {
  return prisma.categorie.findMany({
    orderBy: [{ type: "asc" }, { ordre: "asc" }, { nom: "asc" }],
  });
}
