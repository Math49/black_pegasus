import "server-only";
import { cache } from "react";
import { estEnRetard } from "@/domaine/retard";
import { notificationsPanel, type Notification } from "@/domaine/notifications";
import { numeroOperationAffiche } from "@/domaine/numerotation";
import { ouvertureCloture, semaineDe, semainePrecedente } from "@/domaine/semaine";
import type { StatutSemaine } from "@/domaine/types";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { exigerSession } from "@/lib/garde";
import { peut } from "@/domaine/permissions";

export type DonneesPanel = {
  maintenant: Date;
  fuseau: string;
  vehicules: number;
  contratsEnCours: number;
  retards: number;
  semaine: { numero: number; statut: StatutSemaine; ouvertureCloture: Date };
  notifications: Notification[];
  demandesNouvelles: number;
};

const CATEGORIES_DEPENSES = ["ENTRETIEN", "IMPOTS", "ACHAT_VEHICULE", "DIVERS"] as const;

/** Données communes au gabarit du panel (barre latérale, cloche), une fois par requête. */
export const lireDonneesPanel = cache(async (): Promise<DonneesPanel> => {
  const compte = await exigerSession();
  const instant = await maintenant();
  const parametres = await prisma.parametres.findUniqueOrThrow({
    where: { id: 1 },
    select: { fuseauServeur: true, ouvertureClotureHeuresAvantFin: true },
  });
  const fuseau = parametres.fuseauServeur;
  const courante = semaineDe(instant, fuseau);
  const precedente = semainePrecedente(courante, fuseau);

  const voitEncheres = peut(compte.role, "enchere.gerer");
  const [vehicules, contrats, semaines, depenses, demandesNouvelles, encheres, offresRecentes] =
    await Promise.all([
      prisma.vehicule.count({ where: { supprimeLe: null } }),
      prisma.contrat.findMany({
        where: { statut: "EN_COURS" },
        select: { numero: true, clientNom: true, finPrevue: true },
      }),
      prisma.semaine.findMany({
        where: { id: { in: [courante.id, precedente.id] } },
        select: { id: true, statut: true },
      }),
      prisma.mouvement.findMany({
        where: {
          semaine: { statut: "OUVERTE" },
          sens: "SORTIE",
          categorie: { in: [...CATEGORIES_DEPENSES] },
          justificatifNumero: null,
          annuleMouvementId: null,
        },
        select: { numero: true },
        orderBy: { numero: "asc" },
      }),
      peut(compte.role, "demande.consulter")
        ? prisma.demandeContact.count({ where: { statut: "NOUVELLE" } })
        : Promise.resolve(0),
      // Enchères terminées (fin passée) : à conclure si une offre est retenue.
      voitEncheres
        ? prisma.enchere.findMany({
            where: { statut: "OUVERTE", finPrevue: { lte: instant } },
            select: {
              id: true,
              carte: { select: { nom: true } },
              offres: { where: { invalidee: false }, select: { id: true }, take: 1 },
            },
            orderBy: { finPrevue: "asc" },
          })
        : Promise.resolve([]),
      voitEncheres
        ? prisma.offreEnchere.count({
            where: {
              invalidee: false,
              date: { gt: new Date(instant.getTime() - 24 * 3_600_000), lte: instant },
            },
          })
        : Promise.resolve(0),
    ]);
  const statut = (id: string) => semaines.find((s) => s.id === id)?.statut;

  return {
    maintenant: instant,
    fuseau,
    vehicules,
    contratsEnCours: contrats.length,
    retards: contrats.filter((c) => estEnRetard(c.finPrevue, instant)).length,
    demandesNouvelles,
    semaine: {
      numero: courante.numero,
      // Une semaine pas encore créée en base s'ouvrira au premier mouvement (CONCEPTION § 6.3).
      statut: statut(courante.id) ?? "OUVERTE",
      ouvertureCloture: ouvertureCloture(
        courante,
        parametres.ouvertureClotureHeuresAvantFin,
        fuseau,
      ),
    },
    notifications: notificationsPanel({
      contratsEnCours: contrats,
      semainePrecedenteOuverte: statut(precedente.id) === "OUVERTE" ? precedente.numero : null,
      depensesSansJustificatif: depenses.map((m) => numeroOperationAffiche(m.numero)),
      maintenant: instant,
      fuseau,
      demandesFormationNouvelles: demandesNouvelles,
      encheresAConclure: encheres
        .filter((e) => e.offres.length > 0)
        .map((e) => ({ id: e.id, carte: e.carte.nom })),
      offresRecentes,
    }),
  };
});
