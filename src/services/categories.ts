import "server-only";
import { cache } from "react";
import { revalidatePath } from "next/cache";
import {
  verifierArchivageCategorie,
  verifierCategorie,
  verifierSuppressionCategorie,
  type DefinitionCategorie,
  type SaisieCategorie,
} from "@/domaine/categories";
import { ErreurMetier } from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";

// Catégories de mouvements (REFONTE-ADMIN § 2).

const ORDRE = [{ ordre: "asc" as const }, { nom: "asc" as const }];

/** Toutes les catégories, archivées comprises (libellés de l'historique). */
export const lireCategoriesMouvement = cache((): Promise<DefinitionCategorie[]> =>
  prisma.categorieMouvement.findMany({
    orderBy: ORDRE,
    select: {
      id: true,
      nom: true,
      sens: true,
      filiale: true,
      justificatifObligatoire: true,
      systeme: true,
      archivee: true,
    },
  }),
);

/** Nom de chaque catégorie, par identifiant. */
export async function lireLibellesCategories(): Promise<Record<string, string>> {
  return Object.fromEntries((await lireCategoriesMouvement()).map((c) => [c.id, c.nom]));
}

/** Paramètres : catégories avec leur nombre de mouvements. */
export function lireCategoriesAdmin() {
  return prisma.categorieMouvement.findMany({
    orderBy: ORDRE,
    include: { _count: { select: { mouvements: true } } },
  });
}

export async function lireDefinitionCategorie(db: Pick<Tx, "categorieMouvement">, id: string) {
  const c = await db.categorieMouvement.findUnique({ where: { id } });
  if (!c) throw new ErreurMetier("Catégorie introuvable.");
  return c;
}

function revalider() {
  revalidatePath("/admin", "layout");
}

async function ecrire<T>(
  acteur: CompteConnecte,
  action: string,
  cible: string,
  travail: (
    tx: Tx,
  ) => Promise<{ details?: Record<string, string | number | boolean | null>; valeur: T }>,
) {
  const valeur = await enTransaction(async (tx) => {
    const r = await travail(tx);
    await journaliser(tx, { compteId: acteur.id, action, cible, details: r.details });
    return r.valeur;
  });
  revalider();
  return valeur;
}

export function enregistrerCategorieMouvement(
  acteur: CompteConnecte,
  id: string | null,
  saisie: SaisieCategorie,
) {
  const nom = saisie.nom.trim();
  return ecrire(
    acteur,
    id ? "categorieMouvement.modifier" : "categorieMouvement.creer",
    nom,
    async (tx) => {
      const existante = id ? await lireDefinitionCategorie(tx, id) : undefined;
      const [autres, utilisations] = await Promise.all([
        tx.categorieMouvement.findMany({
          where: id ? { id: { not: id } } : {},
          select: { nom: true },
        }),
        id ? tx.mouvement.count({ where: { categorie: id } }) : Promise.resolve(0),
      ]);
      verifierCategorie({ saisie, existante, utilisations, nomsPris: autres.map((a) => a.nom) });
      const data = {
        nom,
        sens: saisie.sens,
        filiale: saisie.filiale,
        justificatifObligatoire: saisie.justificatifObligatoire,
      };
      if (existante) {
        await tx.categorieMouvement.update({ where: { id: existante.id }, data });
        const details: Record<string, string> = {};
        if (existante.nom !== nom) details.ancienNom = existante.nom;
        return { valeur: existante.id, details };
      }
      const max = await tx.categorieMouvement.aggregate({ _max: { ordre: true } });
      const c = await tx.categorieMouvement.create({
        data: { ...data, ordre: (max._max.ordre ?? 0) + 1 },
      });
      const details: Record<string, string> = { sens: saisie.sens };
      return { valeur: c.id, details };
    },
  );
}

export function archiverCategorieMouvement(acteur: CompteConnecte, id: string, archivee: boolean) {
  return ecrire(
    acteur,
    archivee ? "categorieMouvement.archiver" : "categorieMouvement.restaurer",
    id,
    async (tx) => {
      const c = await lireDefinitionCategorie(tx, id);
      if (archivee) verifierArchivageCategorie(c);
      await tx.categorieMouvement.update({ where: { id }, data: { archivee } });
      return { valeur: c.nom, details: { nom: c.nom } };
    },
  );
}

export function supprimerCategorieMouvement(acteur: CompteConnecte, id: string) {
  return ecrire(acteur, "categorieMouvement.supprimer", id, async (tx) => {
    const c = await lireDefinitionCategorie(tx, id);
    verifierSuppressionCategorie(c, await tx.mouvement.count({ where: { categorie: id } }));
    await tx.categorieMouvement.delete({ where: { id } });
    return { valeur: c.nom, details: { nom: c.nom } };
  });
}
