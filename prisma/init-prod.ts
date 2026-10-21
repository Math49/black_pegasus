// Initialisation de la PRODUCTION (CONCEPTION § 12 « Données en production »), lancée une
// seule fois à la main. Ne crée que ce qui manque : relancer le script ne modifie rien.
//
//   npm run db:init-prod -- --telephone 555-0100 --horaires "Tous les jours · 14h – 02h" \
//     --immatriculation "SA-123456" --solde 250000 [--fuseau Europe/Paris]
//
// Le premier administrateur vient de ADMIN_DISCORD_ID. Aucune donnée de démonstration.
import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { estIdentifiantDiscord } from "../src/domaine/comptes";
import { estFuseauValide } from "../src/domaine/parametres";
import { semaineDe } from "../src/domaine/semaine";
import { urlBase } from "../src/lib/urlBase";
import { categoriesInitiales, reglement, reglesInitiales, textesSite } from "./contenus";

const { values: v } = parseArgs({
  options: {
    telephone: { type: "string", default: process.env.AGENCE_TELEPHONE || undefined },
    horaires: { type: "string", default: process.env.AGENCE_HORAIRES || undefined },
    immatriculation: { type: "string", default: process.env.AGENCE_IMMATRICULATION || undefined },
    solde: { type: "string", default: process.env.SOLDE_OUVERTURE || undefined },
    fuseau: { type: "string", default: process.env.FUSEAU_SERVEUR || "Europe/Paris" },
  },
});

function arreter(message: string): never {
  console.error(`✗ ${message}`);
  process.exit(1);
}

async function main() {
  const adminDiscordId = process.env.ADMIN_DISCORD_ID ?? "";
  if (!estIdentifiantDiscord(adminDiscordId)) arreter("ADMIN_DISCORD_ID manquant ou invalide.");
  if (!estFuseauValide(v.fuseau!)) arreter(`Fuseau inconnu : ${v.fuseau}`);

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: urlBase() }),
  });
  try {
    // Garde-fou : une base contenant déjà des mouvements n'est jamais réinitialisée.
    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
    if (!parametres) {
      if (!v.telephone || !v.horaires || !v.immatriculation)
        arreter(
          "Première initialisation : AGENCE_TELEPHONE, AGENCE_HORAIRES et AGENCE_IMMATRICULATION sont requis.",
        );
      await prisma.parametres.create({
        data: {
          id: 1,
          telephoneAgence: v.telephone,
          horaires: v.horaires,
          numeroImmatriculationEntreprise: v.immatriculation,
          fuseauServeur: v.fuseau,
          ...reglesInitiales,
          textesSite,
          reglement: { ...reglement, dateMiseAJour: new Date().toISOString().slice(0, 10) },
        },
      });
      console.log("✓ Paramètres créés (textes et règlement de départ, à relire dans Paramètres).");
    } else console.log("· Paramètres déjà présents : inchangés.");

    for (const [type, noms] of Object.entries(categoriesInitiales)) {
      for (const [ordre, nom] of noms.entries()) {
        await prisma.categorie.upsert({
          where: { type_nom: { type: type as keyof typeof categoriesInitiales, nom } },
          create: { type: type as keyof typeof categoriesInitiales, nom, ordre },
          update: {},
        });
      }
    }
    console.log("✓ Catégories présentes.");

    const admin = await prisma.compte.upsert({
      where: { discordId: adminDiscordId },
      create: { discordId: adminDiscordId, pseudo: "", nomAffiche: "", role: "ADMIN", actif: true },
      update: {},
    });
    console.log(
      `✓ Administrateur ${admin.discordId} (${admin.role}, ${admin.actif ? "actif" : "inactif"}).`,
    );

    if ((await prisma.semaine.count()) === 0) {
      const solde = Number(v.solde);
      if (!Number.isSafeInteger(solde) || solde < 0)
        arreter(
          "Première initialisation : SOLDE_OUVERTURE (solde de caisse, dollars entiers) est requis.",
        );
      const fuseau = (await prisma.parametres.findUniqueOrThrow({ where: { id: 1 } }))
        .fuseauServeur;
      const s = semaineDe(new Date(), fuseau);
      await prisma.semaine.create({
        data: {
          id: s.id,
          annee: s.annee,
          numero: s.numero,
          debut: s.debut,
          fin: s.fin,
          soldeOuverture: solde,
        },
      });
      console.log(`✓ Semaine ${s.numero} ouverte avec un solde de $${solde}.`);
    } else console.log("· Des semaines existent déjà : solde inchangé.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
