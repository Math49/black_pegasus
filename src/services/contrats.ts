import "server-only";
import { TZDate } from "@date-fns/tz";
import { revalidatePath } from "next/cache";
import { preparerContrePassation } from "@/domaine/comptabilite";
import { bilanCloture, mouvementsCreation } from "@/domaine/contrats";
import { exemplaireLouable } from "@/domaine/disponibilite";
import { cleCompteurContrats, numeroContrat } from "@/domaine/numerotation";
import { calculerTarif } from "@/domaine/tarif";
import { ErreurMetier } from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { enTransaction } from "@/lib/transaction";
import { journaliser } from "./audit";
import { inscrireMouvement, lireRegles } from "./mouvements";
import { genererPdfContrat } from "./pdf";

function revaliderContrats(slug?: string) {
  revalidatePath("/admin/contrats");
  revalidatePath("/admin");
  revalidatePath("/location");
  revalidatePath("/location/flotte");
  if (slug) revalidatePath(`/location/flotte/${slug}`);
}

export type DonneesCreation = {
  clientNom: string;
  clientTelephone: string;
  numeroLicence?: string | null;
  exemplaireId: string;
  debut: Date;
  finPrevue: Date;
};

/** CONCEPTION § 6.1 : verrou sur l'exemplaire, tarif recalculé, numéro, mouvements, PDF. */
export async function creerContrat(acteur: CompteConnecte, d: DonneesCreation) {
  const instant = await maintenant();
  const contrat = await enTransaction(async (tx) => {
    // Verrou de ligne : deux créations simultanées sur le même exemplaire s'excluent.
    const verrou = await tx.$queryRaw<{ statut: string }[]>`
      SELECT statut FROM "Exemplaire" WHERE id = ${d.exemplaireId} FOR UPDATE`;
    if (verrou.length === 0) throw new ErreurMetier("Exemplaire introuvable.");
    const exemplaire = await tx.exemplaire.findUniqueOrThrow({
      where: { id: d.exemplaireId },
      include: { vehicule: true },
    });
    if (exemplaire.vehicule.supprimeLe)
      throw new ErreurMetier("Ce véhicule a été retiré de la flotte.");
    if (!exemplaireLouable(exemplaire.statut)) {
      throw new ErreurMetier(
        exemplaire.statut === "LOUE"
          ? "Exemplaire déjà loué."
          : "Exemplaire en maintenance : il ne peut pas être loué.",
      );
    }

    const regles = await lireRegles(tx);
    const v = exemplaire.vehicule;
    // Le montant est toujours recalculé ici, jamais repris du navigateur.
    const tarif = calculerTarif({
      debut: d.debut,
      fin: d.finPrevue,
      prixHeure: v.prixHeure,
      prixJour: v.prixJour,
      fuseau: regles.fuseau,
    });

    const annee = new TZDate(instant.getTime(), regles.fuseau).getFullYear();
    const compteur = await tx.compteur.upsert({
      where: { cle: cleCompteurContrats(annee) },
      create: { cle: cleCompteurContrats(annee), valeur: 1 },
      update: { valeur: { increment: 1 } },
    });

    const cree = await tx.contrat.create({
      data: {
        numero: numeroContrat(annee, compteur.valeur),
        clientNom: d.clientNom.trim(),
        clientTelephone: d.clientTelephone.trim(),
        numeroLicence: d.numeroLicence?.trim() || null,
        exemplaireId: exemplaire.id,
        vehiculeNom: v.nom,
        prixHeure: v.prixHeure,
        prixJour: v.prixJour,
        debut: d.debut,
        finPrevue: d.finPrevue,
        heuresFacturees: tarif.heures,
        tarifApplique: tarif.tarifApplique,
        montantLocation: tarif.montant,
        caution: v.caution,
        creeParId: acteur.id,
        creeLe: instant,
      },
    });
    await tx.exemplaire.update({ where: { id: exemplaire.id }, data: { statut: "LOUE" } });

    for (const m of mouvementsCreation({
      vehiculeNom: v.nom,
      clientNom: cree.clientNom,
      caution: v.caution,
      tarif,
    })) {
      await inscrireMouvement(
        tx,
        {
          ...m,
          date: instant,
          contratId: cree.id,
          automatique: true,
          filiale: "BPL",
          saisiParId: acteur.id,
        },
        regles.fuseau,
      );
    }
    await journaliser(tx, {
      compteId: acteur.id,
      action: "contrat.creer",
      cible: `Contrat:${cree.numero}`,
      details: {
        client: cree.clientNom,
        vehicule: v.nom,
        montant: tarif.montant,
        caution: v.caution,
      },
    });
    return { ...cree, slug: v.slug };
  });

  // Hors transaction : un échec du PDF n'annule pas le contrat (il sera régénéré au téléchargement).
  await genererPdfContrat(contrat.id).catch((e) =>
    console.error("PDF du contrat", contrat.numero, e),
  );
  revaliderContrats(contrat.slug);
  return contrat;
}

export type DonneesCloture = {
  retourReel: Date;
  forfaits: string[];
  note: string;
  maintenance: boolean;
};

/** CONCEPTION § 6.2 : pénalités à part, caution rendue, exemplaire libéré. */
export async function cloturerContrat(
  acteur: CompteConnecte,
  contratId: string,
  d: DonneesCloture,
) {
  const instant = await maintenant();
  const resultat = await enTransaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Contrat" WHERE id = ${contratId} FOR UPDATE`;
    const contrat = await tx.contrat.findUnique({
      where: { id: contratId },
      include: { exemplaire: { include: { vehicule: true } } },
    });
    if (!contrat) throw new ErreurMetier("Contrat introuvable.");
    if (contrat.statut !== "EN_COURS") throw new ErreurMetier("Ce contrat est déjà clôturé.");
    if (d.retourReel.getTime() < contrat.debut.getTime()) {
      throw new ErreurMetier("Le retour ne peut pas précéder le début de la location.");
    }
    if (d.retourReel.getTime() > instant.getTime() + 5 * 60_000) {
      throw new ErreurMetier("L’heure de retour ne peut pas être dans le futur.");
    }

    const regles = await lireRegles(tx);
    const forfaitsCoches = regles.forfaitsDegats.filter((f) => d.forfaits.includes(f.libelle));
    if (forfaitsCoches.length !== new Set(d.forfaits).size)
      throw new ErreurMetier("Forfait de dégâts inconnu.");
    const bilan = bilanCloture({
      contrat,
      retourReel: d.retourReel,
      forfaitsCoches,
      regles,
      fuseau: regles.fuseau,
    });

    for (const m of bilan.mouvements) {
      await inscrireMouvement(
        tx,
        {
          ...m,
          date: d.retourReel,
          contratId,
          automatique: true,
          filiale: "BPL",
          saisiParId: acteur.id,
        },
        regles.fuseau,
      );
    }
    await tx.contrat.update({
      where: { id: contratId },
      data: {
        statut: "TERMINE",
        retourReel: d.retourReel,
        retardMinutes: bilan.retard.minutes,
        penaliteRetard: bilan.retard.penalite,
        penaliteDegats: bilan.penaliteDegats,
        degats: bilan.degats.length ? bilan.degats : undefined,
        cautionRestituee: bilan.cautionRestituee,
        noteEtatDesLieux: d.note.trim() || null,
        clotureParId: acteur.id,
      },
    });
    await tx.exemplaire.update({
      where: { id: contrat.exemplaireId },
      data: { statut: d.maintenance ? "MAINTENANCE" : "DISPONIBLE" },
    });
    await journaliser(tx, {
      compteId: acteur.id,
      action: "contrat.cloturer",
      cible: `Contrat:${contrat.numero}`,
      details: {
        retardMinutes: bilan.retard.minutes,
        penalites: bilan.penalites,
        cautionRestituee: bilan.cautionRestituee,
        maintenance: d.maintenance,
        defautRestitution: bilan.retard.defautRestitution,
      },
    });
    return { numero: contrat.numero, slug: contrat.exemplaire.vehicule.slug, bilan };
  });
  revaliderContrats(resultat.slug);
  return resultat;
}

/**
 * CONCEPTION § 6.5 : contrat créé par erreur (administrateur, semaines ouvertes seulement) —
 * statut ANNULE, contre-passation de ses mouvements, exemplaire libéré.
 */
export async function annulerContrat(acteur: CompteConnecte, contratId: string) {
  const instant = await maintenant();
  const resultat = await enTransaction(async (tx) => {
    const contrat = await tx.contrat.findUnique({
      where: { id: contratId },
      include: {
        exemplaire: { include: { vehicule: true } },
        mouvements: { include: { semaine: true, annulePar: true } },
      },
    });
    if (!contrat) throw new ErreurMetier("Contrat introuvable.");
    if (contrat.statut === "ANNULE") throw new ErreurMetier("Ce contrat est déjà annulé.");
    if (contrat.mouvements.some((m) => m.semaine.statut === "CLOTUREE")) {
      throw new ErreurMetier(
        "Ce contrat a des mouvements dans une semaine clôturée : annulation impossible.",
      );
    }
    const regles = await lireRegles(tx);
    for (const m of contrat.mouvements.filter((x) => !x.annuleMouvementId && !x.annulePar)) {
      const inverse = preparerContrePassation(m, false);
      await inscrireMouvement(
        tx,
        {
          ...inverse,
          date: instant,
          contratId,
          automatique: true,
          filiale: m.filiale,
          saisiParId: acteur.id,
        },
        regles.fuseau,
      );
    }
    await tx.contrat.update({ where: { id: contratId }, data: { statut: "ANNULE" } });
    if (contrat.statut === "EN_COURS") {
      await tx.exemplaire.update({
        where: { id: contrat.exemplaireId },
        data: { statut: "DISPONIBLE" },
      });
    }
    await journaliser(tx, {
      compteId: acteur.id,
      action: "contrat.annuler",
      cible: `Contrat:${contrat.numero}`,
    });
    return { numero: contrat.numero, slug: contrat.exemplaire.vehicule.slug };
  });
  revaliderContrats(resultat.slug);
  return resultat;
}

// ── Lectures ────────────────────────────────────────────────────────────────

export async function lireContrats() {
  return prisma.contrat.findMany({
    include: { exemplaire: { include: { vehicule: { include: { categorie: true } } } } },
    orderBy: [{ finPrevue: "asc" }],
  });
}

export async function lireContrat(id: string) {
  return prisma.contrat.findUnique({
    where: { id },
    include: {
      exemplaire: { include: { vehicule: { include: { categorie: true } } } },
      creePar: true,
      mouvements: { orderBy: { numero: "asc" } },
    },
  });
}

/** Prochain numéro de contrat (affiché à titre indicatif ; attribué à l'enregistrement). */
export async function prochainNumeroContrat(instant: Date, fuseau: string) {
  const annee = new TZDate(instant.getTime(), fuseau).getFullYear();
  const c = await prisma.compteur.findUnique({ where: { cle: cleCompteurContrats(annee) } });
  return numeroContrat(annee, (c?.valeur ?? 0) + 1);
}
