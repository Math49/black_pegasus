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
import { descriptions, filialesInitiales, reglement, textesGroupe, textesSite } from "./contenus";

if (process.env.NODE_ENV === "production") {
  throw new Error("Le seed de démonstration ne doit jamais être lancé en production.");
}

const FUSEAU = "Europe/Paris";
const DONNEES = path.join(process.cwd(), "docs/handoff/data");
const PHOTO_PROVISOIRE = "photos/vehicule-placeholder.jpg";
/** Image de démonstration servie comme justificatif des dépenses du seed. */
const JUSTIFICATIF_DEMO = "justificatifs/justificatif-demo.jpg";

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
  recettes8Semaines: Record<string, number>;
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
  for (const cle of [PHOTO_PROVISOIRE, JUSTIFICATIF_DEMO]) {
    await mkdir(path.dirname(path.join(stockage, cle)), { recursive: true });
    await copyFile(
      path.join(process.cwd(), "docs/handoff/assets/images/vehicule-placeholder.jpg"),
      path.join(stockage, cle),
    );
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(
        `TRUNCATE "JournalAudit", "Mouvement", "Contrat", "Semaine", "Exemplaire", "Vehicule",
         "Categorie", "Compteur", "Parametres", "Filiale", "Session", "Account", "User", "VerificationToken",
         "Compte" RESTART IDENTITY CASCADE`,
      );

      // ── Paramètres ──
      const p = demo.parametres;
      await tx.filiale.createMany({
        data: filialesInitiales.map((f) => ({
          ...f,
          telephone: p.telephoneAgence,
          horaires: p.horaires,
        })),
      });
      await tx.parametres.create({
        data: {
          fuseauServeur: FUSEAU,
          numeroImmatriculationEntreprise: p.numeroImmatriculationEntreprise,
          toleranceRetardMin: p.toleranceRetardMin,
          majorationRetard: p.majorationRetard,
          forfaitsDegats: p.forfaitsDegats,
          textesSite,
          textesGroupe,
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
            // Les noms des maquettes sont des noms de personnages : ils servent de nom RP.
            nomRp: c.nomAffiche,
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
      // Compte FISC de démonstration (consultation seule), absent des données des maquettes.
      await tx.compte.create({
        data: {
          discordId: "700000000000000001",
          pseudo: "agent.fisc",
          nomAffiche: "Agent du FISC",
          nomRp: "Inspecteur Daniel Hart",
          role: "FISC",
          ajouteLe: h("2026-10-20T10:00"),
          ajouteParId: comptes.get("318574920163840001"),
        },
      });
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
      const s43 = semaineParNumero(2026, 43, FUSEAU);
      const vmoretti = compteId(s42Demo.clotureePar!);

      // S36–S42 : seuls leurs totaux sont connus (recettes8Semaines, S42 complète). Deux
      // opérations de reprise par semaine gardent le registre cohérent : solde d'ouverture +
      // mouvements = solde d'ouverture de la suivante, jusqu'à S42 = $349 530. Les dépenses de
      // S36–S41, absentes des données, sont reconstituées à 26 % des recettes (ratio de S42).
      const reprises = Object.entries(demo.recettes8Semaines)
        .map(([cle, recettes]) => ({ numero: Number(cle.slice(1)), recettes }))
        .filter((r) => r.numero < 43)
        .map((r) => ({
          ...r,
          depenses: r.numero === 42 ? s42Demo.depenses : Math.round((r.recettes * 0.26) / 50) * 50,
        }));
      let ouverture =
        s42Demo.soldeOuverture -
        reprises.filter((r) => r.numero < 42).reduce((t, r) => t + r.recettes - r.depenses, 0);
      for (const r of reprises) {
        const s = semaineParNumero(2026, r.numero, FUSEAU);
        const cloture = ouverture + r.recettes - r.depenses;
        const fin = new Date(s.fin.getTime() - 10 * 60_000);
        await tx.semaine.create({
          data: {
            id: s.id,
            annee: s.annee,
            numero: s.numero,
            debut: s.debut,
            fin: s.fin,
            statut: "CLOTUREE",
            soldeOuverture: ouverture,
            soldeCloture: cloture,
            clotureeLe:
              r.numero === 42 ? h(s42Demo.clotureeLe!) : new Date(fin.getTime() + 8 * 60_000),
            clotureeParId: vmoretti,
            compteurOperations: 2,
            compteurJustificatifs: 1,
          },
        });
        await tx.mouvement.createMany({
          data: [
            {
              numero: numeroOperationEnBase(2026, r.numero, 1),
              semaineId: s.id,
              date: fin,
              sens: "ENTREE",
              categorie: "LOCATION",
              montant: r.recettes,
              motif: `Reprise : recettes de la semaine ${r.numero}`,
              filiale: "BPL",
              saisiParId: vmoretti,
            },
            {
              numero: numeroOperationEnBase(2026, r.numero, 2),
              semaineId: s.id,
              date: fin,
              sens: "SORTIE",
              categorie: "DIVERS",
              montant: r.depenses,
              motif: `Reprise : dépenses de la semaine ${r.numero}`,
              justificatif: JUSTIFICATIF_DEMO,
              justificatifNumero: `JUST-${r.numero}-01`,
              filiale: "BPL",
              saisiParId: vmoretti,
            },
          ],
        });
        ouverture = cloture;
      }

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
      // Contrats des maquettes en CTR- ; les nouveaux continuent la séquence en BPL-.
      await tx.compteur.createMany({
        data: [
          { cle: "CTR-2026", valeur: dernierContrat },
          { cle: "BPL-2026", valeur: dernierContrat },
        ],
      });

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
            justificatif: m.justificatif ? JUSTIFICATIF_DEMO : null,
            justificatifNumero: m.justificatif,
            automatique: m.contrat !== null,
            // Seule Location existait ; les impôts relèvent du groupe.
            filiale: m.categorie === "IMPOTS" ? null : "BPL",
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
  const s42 = semaines.at(-2)!;
  const s43 = semaines.at(-1)!;
  verifier(
    semaines.length === 8 && s42.id === "2026-S42" && s43.id === "2026-S43",
    "semaines S36 à S43",
  );
  for (let i = 1; i < semaines.length; i++) {
    const prec = semaines[i - 1];
    const s = synthese(prec.mouvements.map(versComptable), prec.soldeOuverture);
    verifier(s.solde === prec.soldeCloture, `solde de clôture ${prec.id}`);
    verifier(semaines[i].soldeOuverture === prec.soldeCloture, `ouverture ${semaines[i].id}`);
  }
  verifier(s42.soldeOuverture === 349530, "solde d'ouverture S42 = $349 530");

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
