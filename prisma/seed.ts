// Seed de DÉMONSTRATION (développement uniquement) : flotte, comptes, semaines S42–S43,
// contrats et mouvements de docs/handoff/data, avec les corrections de CONCEPTION § 9.4.
// Relançable : vide les tables métier avant de les remplir.
import "dotenv/config";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "../src/generated/prisma/client";
import { synthese, type MouvementComptable } from "../src/domaine/comptabilite";
import { depuisHeureServeur } from "../src/domaine/dates";
import { numeroOperationEnBase } from "../src/domaine/numerotation";
import { calculerRetard } from "../src/domaine/retard";
import { semaineParNumero } from "../src/domaine/semaine";
import { calculerTarif } from "../src/domaine/tarif";
import type {
  CategorieMouvement,
  Sens,
  StatutExemplaire,
  TypeVehicule,
} from "../src/domaine/types";
import { descriptions, reglement, textesSite } from "./contenus";

if (process.env.NODE_ENV === "production") {
  throw new Error("Le seed de démonstration ne doit jamais être lancé en production.");
}

const FUSEAU = "Europe/Paris";
const DONNEES = path.join(process.cwd(), "docs/handoff/data");
const PHOTO_PROVISOIRE = "photos/vehicule-placeholder.jpg";

// Corrections CONCEPTION § 9.4 (D7a, D7b).
const RENOMMAGES: [string, string][] = [["Streamer 2026", "Streamer216"]];
const SLUGS: Record<string, string> = { "streamer-2026": "streamer216" };
const MOTIFS: Record<string, string> = { "OP-43-027": "Frais de représentation" };
const renommer = (texte: string) => RENOMMAGES.reduce((t, [a, b]) => t.replaceAll(a, b), texte);

// Chiffres des maquettes que le seed doit retrouver.
const ATTENDU_S43 = {
  recettes: 91400,
  depenses: 24150,
  resultatImposable: 67250,
  cautionsDetenues: 35000,
  solde: 514630,
};

type Flotte = {
  vehicules: {
    slug: string;
    nom: string;
    type: TypeVehicule;
    categorie: string;
    places: number;
    contenanceKg: number;
    prixHeure: number;
    prixJour: number;
    caution: number;
    visibleSurSite: boolean;
    exemplaires: { immatriculation: string; statut: StatutExemplaire }[];
  }[];
};

type Demo = {
  parametres: {
    telephoneAgence: string;
    horaires: string;
    toleranceRetardMin: number;
    majorationRetard: number;
    forfaitsDegats: { libelle: string; montant: number }[];
    numeroImmatriculationEntreprise: string;
  };
  comptes: {
    discordId: string;
    pseudo: string;
    nomAffiche: string;
    role: "ADMIN" | "GESTIONNAIRE";
    actif: boolean;
    ajouteLe: string;
    ajoutePar: string | null;
    derniereConnexion: string;
  }[];
  semaines: {
    annee: number;
    numero: number;
    statut: "OUVERTE" | "CLOTUREE";
    soldeOuverture: number;
    recettes: number;
    depenses: number;
    soldeCloture?: number;
    clotureeLe?: string;
    clotureePar?: string;
  }[];
  contrats: {
    numero: string;
    clientNom: string;
    clientTelephone: string;
    exemplaire: string;
    debut: string;
    finPrevue: string;
    retourReel: string | null;
    heuresFacturees: number;
    tarifApplique: "HORAIRE" | "JOURNALIER";
    montantLocation: number;
    caution: number;
    statut: "EN_COURS" | "TERMINE";
    penaliteRetard: number | null;
    penaliteDegats: number | null;
    creePar: string;
  }[];
  mouvements: {
    numero: string;
    date: string;
    sens: Sens;
    categorie: CategorieMouvement;
    montant: number;
    motif: string;
    contrat: string | null;
    justificatif: string | null;
    saisiPar: string;
  }[];
};

const lireJson = async <T>(fichier: string) =>
  JSON.parse(await readFile(path.join(DONNEES, fichier), "utf8")) as T;

const h = (texte: string) =>
  depuisHeureServeur(texte.length === 10 ? `${texte}T00:00` : texte, FUSEAU);

function verifier(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(`Vérification du seed échouée : ${message}`);
}

async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const flotte = await lireJson<Flotte>("flotte.json");
  const demo = await lireJson<Demo>("demo-semaine-43.json");

  // Photo provisoire commune, déposée dans le stockage local.
  const stockage = path.resolve(process.env.STOCKAGE_DIR ?? "./data");
  await mkdir(path.join(stockage, "photos"), { recursive: true });
  await copyFile(
    path.join(process.cwd(), "docs/handoff/assets/images/vehicule-placeholder.jpg"),
    path.join(stockage, PHOTO_PROVISOIRE),
  );

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `TRUNCATE "JournalAudit", "Mouvement", "Contrat", "Semaine", "Exemplaire", "Vehicule",
         "Categorie", "Compteur", "Parametres", "Session", "Account", "User", "VerificationToken",
         "Compte" RESTART IDENTITY CASCADE`,
      );

      // ── Paramètres ──
      const p = demo.parametres;
      await tx.parametres.create({
        data: {
          telephoneAgence: p.telephoneAgence,
          horaires: p.horaires,
          fuseauServeur: FUSEAU,
          numeroImmatriculationEntreprise: p.numeroImmatriculationEntreprise,
          toleranceRetardMin: p.toleranceRetardMin,
          majorationRetard: p.majorationRetard,
          forfaitsDegats: p.forfaitsDegats,
          textesSite,
          reglement,
        },
      });

      // ── Comptes ──
      const comptes = new Map<string, string>(); // discordId → id
      for (const c of demo.comptes) {
        const cree = await tx.compte.create({
          data: {
            discordId: c.discordId,
            pseudo: c.pseudo,
            nomAffiche: c.nomAffiche,
            role: c.role,
            actif: c.actif,
            ajouteLe: h(c.ajouteLe),
            derniereConnexion: h(c.derniereConnexion),
          },
        });
        comptes.set(c.discordId, cree.id);
      }
      for (const c of demo.comptes) {
        if (c.ajoutePar) {
          await tx.compte.update({
            where: { discordId: c.discordId },
            data: { ajouteParId: comptes.get(c.ajoutePar) },
          });
        }
      }
      const adminDiscordId = process.env.ADMIN_DISCORD_ID?.trim();
      if (adminDiscordId && !comptes.has(adminDiscordId)) {
        // Pseudo, nom et avatar seront mis à jour depuis Discord à la première connexion.
        await tx.compte.create({
          data: {
            discordId: adminDiscordId,
            pseudo: "",
            nomAffiche: "",
            role: "ADMIN",
          },
        });
      }
      const compteId = (discordId: string) => {
        const id = comptes.get(discordId);
        verifier(!!id, `compte inconnu ${discordId}`);
        return id;
      };

      // ── Catégories, véhicules, exemplaires ──
      const categories = new Map<string, string>(); // "TYPE:nom" → id
      const exemplaires = new Map<string, { id: string; vehicule: Flotte["vehicules"][number] }>();
      for (const v of flotte.vehicules) {
        const cle = `${v.type}:${v.categorie}`;
        if (!categories.has(cle)) {
          const ordre = [...categories.keys()].filter((k) => k.startsWith(`${v.type}:`)).length;
          const cat = await tx.categorie.create({
            data: { type: v.type, nom: v.categorie, ordre },
          });
          categories.set(cle, cat.id);
        }
        const slug = SLUGS[v.slug] ?? v.slug;
        const vehicule = await tx.vehicule.create({
          data: {
            slug,
            nom: renommer(v.nom),
            type: v.type,
            categorieId: categories.get(cle)!,
            places: v.places,
            contenanceKg: v.contenanceKg,
            prixHeure: v.prixHeure,
            prixJour: v.prixJour,
            caution: v.caution,
            photo: PHOTO_PROVISOIRE,
            description: descriptions[slug] ?? "",
            visibleSurSite: v.visibleSurSite,
            exemplaires: {
              create: v.exemplaires.map((e) => ({
                immatriculation: e.immatriculation,
                statut: e.statut,
              })),
            },
          },
          include: { exemplaires: true },
        });
        for (const e of vehicule.exemplaires)
          exemplaires.set(e.immatriculation, { id: e.id, vehicule: v });
      }

      // ── Semaines ──
      const s42Demo = demo.semaines.find((s) => s.numero === 42)!;
      const s43Demo = demo.semaines.find((s) => s.numero === 43)!;
      const s42 = semaineParNumero(2026, 42, FUSEAU);
      const s43 = semaineParNumero(2026, 43, FUSEAU);
      const vmoretti = compteId(s42Demo.clotureePar!);

      // S42 : seules ses totaux sont connus. Deux opérations de reprise gardent le registre
      // cohérent (solde d'ouverture S42 + mouvements = solde d'ouverture S43).
      await tx.semaine.create({
        data: {
          id: s42.id,
          annee: s42.annee,
          numero: s42.numero,
          debut: s42.debut,
          fin: s42.fin,
          statut: "CLOTUREE",
          soldeOuverture: s42Demo.soldeOuverture,
          soldeCloture: s42Demo.soldeCloture,
          clotureeLe: h(s42Demo.clotureeLe!),
          clotureeParId: vmoretti,
          compteurOperations: 2,
          compteurJustificatifs: 1,
        },
      });
      await tx.mouvement.createMany({
        data: [
          {
            numero: numeroOperationEnBase(2026, 42, 1),
            semaineId: s42.id,
            date: h("2026-10-18T23:50"),
            sens: "ENTREE",
            categorie: "LOCATION",
            montant: s42Demo.recettes,
            motif: "Reprise : recettes de la semaine 42",
            saisiParId: vmoretti,
          },
          {
            numero: numeroOperationEnBase(2026, 42, 2),
            semaineId: s42.id,
            date: h("2026-10-18T23:50"),
            sens: "SORTIE",
            categorie: "DIVERS",
            montant: s42Demo.depenses,
            motif: "Reprise : dépenses de la semaine 42",
            justificatifNumero: "JUST-42-01",
            saisiParId: vmoretti,
          },
        ],
      });

      await tx.semaine.create({
        data: {
          id: s43.id,
          annee: s43.annee,
          numero: s43.numero,
          debut: s43.debut,
          fin: s43.fin,
          statut: "OUVERTE",
          soldeOuverture: s43Demo.soldeOuverture,
          compteurOperations: demo.mouvements.length,
          compteurJustificatifs: demo.mouvements.filter((m) => m.justificatif).length,
        },
      });

      // ── Contrats ──
      const parContrat = (numero: string) => demo.mouvements.filter((m) => m.contrat === numero);
      const contrats = new Map<string, string>(); // numero → id
      let dernierContrat = 0;
      for (const c of demo.contrats) {
        const ex = exemplaires.get(c.exemplaire);
        verifier(!!ex, `exemplaire inconnu ${c.exemplaire}`);
        const { vehicule } = ex;
        const debut = h(c.debut);
        const finPrevue = h(c.finPrevue);
        const tarif = calculerTarif({
          debut,
          fin: finPrevue,
          prixHeure: vehicule.prixHeure,
          prixJour: vehicule.prixJour,
          fuseau: FUSEAU,
        });
        verifier(
          tarif.heures === c.heuresFacturees &&
            tarif.montant === c.montantLocation &&
            tarif.tarifApplique === c.tarifApplique,
          `tarif de ${c.numero}`,
        );

        const data: Prisma.ContratUncheckedCreateInput = {
          numero: c.numero,
          clientNom: c.clientNom,
          clientTelephone: c.clientTelephone,
          exemplaireId: ex.id,
          vehiculeNom: renommer(vehicule.nom),
          prixHeure: vehicule.prixHeure,
          prixJour: vehicule.prixJour,
          debut,
          finPrevue,
          heuresFacturees: tarif.heures,
          tarifApplique: tarif.tarifApplique,
          montantLocation: tarif.montant,
          caution: vehicule.caution,
          statut: c.statut,
          creeParId: compteId(c.creePar),
          creeLe: debut,
        };

        if (c.statut === "TERMINE") {
          const retourReel = h(c.retourReel!);
          const retard = calculerRetard({
            finPrevue,
            retourReel,
            prixHeure: vehicule.prixHeure,
            toleranceMin: demo.parametres.toleranceRetardMin,
            majoration: demo.parametres.majorationRetard,
            seuilDefautRestitutionMin: 180,
            fuseau: FUSEAU,
          });
          verifier(retard.penalite === c.penaliteRetard, `pénalité de retard de ${c.numero}`);
          const penalitesDegats = parContrat(c.numero).filter(
            (m) => m.categorie === "PENALITE" && !m.motif.startsWith("Retard"),
          );
          const degats = penalitesDegats.map((m) => {
            const forfait = demo.parametres.forfaitsDegats.find((f) => f.montant === m.montant);
            verifier(!!forfait, `forfait de dégâts de ${c.numero}`);
            return { libelle: forfait.libelle, montant: forfait.montant };
          });
          const penaliteDegats = degats.reduce((t, d) => t + d.montant, 0);
          verifier(penaliteDegats === c.penaliteDegats, `pénalité de dégâts de ${c.numero}`);
          const restitution = parContrat(c.numero).find((m) => m.categorie === "CAUTION_RENDUE");
          verifier(!!restitution, `restitution de ${c.numero}`);

          Object.assign(data, {
            retourReel,
            retardMinutes: retard.minutes,
            penaliteRetard: retard.penalite,
            penaliteDegats,
            degats: degats.length ? degats : undefined,
            cautionRestituee: restitution.montant,
            noteEtatDesLieux: penalitesDegats.map((m) => m.motif).join(" · ") || null,
            clotureParId: compteId(restitution.saisiPar),
          });
        }

        const cree = await tx.contrat.create({ data });
        contrats.set(c.numero, cree.id);
        dernierContrat = Math.max(dernierContrat, Number(c.numero.slice(-4)));
      }
      await tx.compteur.create({ data: { cle: "CTR-2026", valeur: dernierContrat } });

      // ── Mouvements S43 ──
      await tx.mouvement.createMany({
        data: demo.mouvements.map((m) => {
          const n = Number(m.numero.slice(-3));
          return {
            numero: numeroOperationEnBase(2026, 43, n),
            semaineId: s43.id,
            date: h(m.date),
            sens: m.sens,
            categorie: m.categorie,
            montant: m.montant,
            motif: MOTIFS[m.numero] ?? renommer(m.motif),
            contratId: m.contrat ? contrats.get(m.contrat) : null,
            justificatifNumero: m.justificatif,
            automatique: m.contrat !== null,
            saisiParId: compteId(m.saisiPar),
          };
        }),
      });
    },
    { timeout: 60_000 },
  );

  await verifierSeed(prisma);
  await prisma.$disconnect();
  console.log("Seed de démonstration terminé et vérifié.");
}

/** Recalcule les chiffres clés avec le domaine : le seed échoue s'ils diffèrent des maquettes. */
async function verifierSeed(prisma: PrismaClient) {
  const versComptable = (m: {
    numero: string;
    sens: Sens;
    categorie: CategorieMouvement;
    montant: number;
    justificatifNumero: string | null;
  }): MouvementComptable => m;
  const semaines = await prisma.semaine.findMany({
    orderBy: { debut: "asc" },
    include: { mouvements: true },
  });
  const [s42, s43] = semaines;
  verifier(
    semaines.length === 2 && s42.id === "2026-S42" && s43.id === "2026-S43",
    "semaines S42 et S43",
  );

  const synthese42 = synthese(s42.mouvements.map(versComptable), s42.soldeOuverture);
  verifier(synthese42.solde === s42.soldeCloture, "solde de clôture S42");
  verifier(s43.soldeOuverture === s42.soldeCloture, "solde d'ouverture S43 = clôture S42");

  const synthese43 = synthese(s43.mouvements.map(versComptable), s43.soldeOuverture);
  for (const [cle, attendu] of Object.entries(ATTENDU_S43)) {
    const obtenu = synthese43[cle as keyof typeof ATTENDU_S43];
    verifier(obtenu === attendu, `S43 ${cle} = ${obtenu}, attendu ${attendu}`);
  }
  verifier(synthese43.nombreOperations === 35, "35 mouvements en S43");

  const enCours = await prisma.contrat.findMany({
    where: { statut: "EN_COURS" },
    include: { exemplaire: true },
  });
  verifier(
    enCours.reduce((t, c) => t + c.caution, 0) === synthese43.cautionsDetenues,
    "cautions détenues = cautions des contrats en cours",
  );
  const loues = await prisma.exemplaire.findMany({ where: { statut: "LOUE" } });
  verifier(
    loues.length === enCours.length && enCours.every((c) => c.exemplaire.statut === "LOUE"),
    "exemplaires loués = exemplaires des contrats en cours",
  );
  const restes = await prisma.mouvement.count({ where: { motif: { contains: "Streamer 2026" } } });
  verifier(restes === 0, "renommage Streamer216");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
