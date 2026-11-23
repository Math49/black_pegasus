import "server-only";
import { prisma } from "@/lib/prisma";
import type { SemaineFiscale } from "@/domaine/semaine";

const DEMANDES_AFFICHEES = 4;

/** Identité des filiales (nom, logo) pour les blocs du tableau de bord. */
export function lireIdentitesFiliales() {
  return prisma.filiale.findMany({
    select: { code: true, nom: true, logo: true },
    orderBy: { ordre: "asc" },
  });
}

/** Formation : dernières demandes de contact non traitées. */
export function lireDernieresDemandes() {
  return prisma.demandeContact.findMany({
    where: { statut: "NOUVELLE" },
    orderBy: [{ creeLe: "desc" }, { id: "desc" }],
    take: DEMANDES_AFFICHEES,
    select: { id: true, nomRp: true, creeLe: true, permis: { select: { nom: true } } },
  });
}

/** Cards : ventes validées de la semaine et état du catalogue. */
export async function lireActiviteCards(semaine: SemaineFiscale) {
  const [ventes, cartes, epuisees] = await Promise.all([
    prisma.venteCarte.count({
      where: { statut: "VALIDEE", date: { gte: semaine.debut, lt: semaine.fin } },
    }),
    prisma.carte.count({ where: { supprimeLe: null } }),
    prisma.carte.count({ where: { supprimeLe: null, stock: 0 } }),
  ]);
  return { ventes, cartes, epuisees };
}
