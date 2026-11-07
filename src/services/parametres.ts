import "server-only";
import { revalidatePath } from "next/cache";
import {
  deplacer,
  estFuseauValide,
  forfaitsCites,
  majorationDepuisPourcent,
  verifierForfaits,
  verifierSuppressionCategorie,
} from "@/domaine/parametres";
import {
  ErreurMetier,
  type CodeFiliale,
  type ForfaitDegats,
  type TypeVehicule,
} from "@/domaine/types";
import type { CompteConnecte } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { enTransaction, type Tx } from "@/lib/transaction";
import { journaliser } from "./audit";
import type { ImageEnvoyee } from "@/lib/fichiers";
import {
  schemaPhotosAccueil,
  type PhotosAccueil,
  type Reglement,
  type TextesSite,
  type TextesGroupe,
} from "./site";
import { enregistrerFichier, supprimerFichier } from "./stockage";

// Paramètres du site (CONCEPTION § 9.1). Chaque enregistrement est journalisé et revalide
// le site public, dont les pages lisent Parametres à chaque requête.

export async function lireParametresAdmin() {
  const [p, filiales, categories] = await Promise.all([
    prisma.parametres.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.filiale.findMany({ orderBy: [{ ordre: "asc" }, { code: "asc" }] }),
    prisma.categorie.findMany({
      orderBy: [{ type: "asc" }, { ordre: "asc" }, { nom: "asc" }],
      include: { _count: { select: { vehicules: true } } },
    }),
  ]);
  return { p, filiales, categories };
}

async function ecrire(
  acteur: CompteConnecte,
  action: string,
  travail: (tx: Tx) => Promise<Record<string, unknown> | void>,
) {
  await enTransaction(async (tx) => {
    const details = (await travail(tx)) ?? {};
    await journaliser(tx, {
      compteId: acteur.id,
      action,
      cible: "Paramètres",
      details: JSON.parse(JSON.stringify(details)),
    });
  });
  revalidatePath("/", "layout");
}

/** Textes où un forfait peut être cité : règlement et textes du site. */
const textesCitant = (reglement: Reglement, textes: TextesSite) => [
  reglement.introduction,
  ...reglement.articles.map((a) => a.contenu),
  textes.accroche.texte,
  textes.maison.texte,
  ...textes.maison.points,
  ...textes.etapes.map((e) => e.texte),
];

export function enregistrerAgence(
  acteur: CompteConnecte,
  d: { nomEntreprise: string; immatriculation: string; fuseau: string },
) {
  if (!estFuseauValide(d.fuseau))
    throw new ErreurMetier(`Fuseau horaire inconnu : « ${d.fuseau} ».`);
  return ecrire(acteur, "parametres.agence", async (tx) => {
    const avant = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    await tx.parametres.update({
      where: { id: 1 },
      data: {
        nomEntreprise: d.nomEntreprise,
        numeroImmatriculationEntreprise: d.immatriculation,
        fuseauServeur: d.fuseau,
      },
    });
    return {
      nomEntreprise: { avant: avant.nomEntreprise, apres: d.nomEntreprise },
      ...(avant.fuseauServeur !== d.fuseau && {
        fuseau: { avant: avant.fuseauServeur, apres: d.fuseau },
      }),
    };
  });
}

export function enregistrerTextesGroupe(acteur: CompteConnecte, textesGroupe: TextesGroupe) {
  return ecrire(acteur, "parametres.textesGroupe", async (tx) => {
    const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    const cites = forfaitsCites([textesGroupe.accroche.texte, textesGroupe.presentation.texte]);
    const forfaits = p.forfaitsDegats as ForfaitDegats[];
    const inconnu = cites.find((c) => !forfaits.some((f) => f.libelle === c));
    if (inconnu) throw new ErreurMetier(`Forfait inconnu dans le texte : « ${inconnu} ».`);
    await tx.parametres.update({ where: { id: 1 }, data: { textesGroupe } });
  });
}

export async function enregistrerFiliale(
  acteur: CompteConnecte,
  code: CodeFiliale,
  donnees: {
    nom: string;
    accroche: string;
    telephone: string;
    horaires: string;
    ordre: number;
    visible: boolean;
  },
  image: ImageEnvoyee | null,
) {
  const cle = image ? await enregistrerFichier("photos", image.octets, image.extension) : null;
  try {
    await ecrire(acteur, "parametres.filiale", async (tx) => {
      const avant = await tx.filiale.findUniqueOrThrow({ where: { code } });
      await tx.filiale.update({
        where: { code },
        data: { ...donnees, ...(cle && { logo: `/api/fichiers/${cle}` }) },
      });
      return {
        code,
        avant,
        apres: { ...donnees, logo: cle ? `/api/fichiers/${cle}` : avant.logo },
      };
    });
  } catch (e) {
    if (cle) await supprimerFichier(cle);
    throw e;
  }
  // Un rendu de PDF en cours peut encore lire l’ancien logo.
}

export function enregistrerTextes(acteur: CompteConnecte, textes: TextesSite) {
  return ecrire(acteur, "parametres.textes", async (tx) => {
    const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    verifierCitations(textes, p.reglement as Reglement, p.forfaitsDegats as ForfaitDegats[]);
    await tx.parametres.update({ where: { id: 1 }, data: { textesSite: textes } });
  });
}

export function enregistrerReglement(acteur: CompteConnecte, reglement: Reglement) {
  return ecrire(acteur, "parametres.reglement", async (tx) => {
    const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    verifierCitations(p.textesSite as TextesSite, reglement, p.forfaitsDegats as ForfaitDegats[]);
    await tx.parametres.update({ where: { id: 1 }, data: { reglement } });
    return { articles: reglement.articles.length };
  });
}

/** Un texte ne peut citer qu'un forfait existant. */
function verifierCitations(textes: TextesSite, reglement: Reglement, forfaits: ForfaitDegats[]) {
  const inconnu = forfaitsCites(textesCitant(reglement, textes)).find(
    (c) => !forfaits.some((f) => f.libelle === c),
  );
  if (inconnu) throw new ErreurMetier(`Forfait inconnu dans le texte : « ${inconnu} ».`);
}

export function enregistrerRegles(
  acteur: CompteConnecte,
  d: {
    toleranceRetardMin: number;
    majorationPourcent: number;
    seuilDefautRestitutionHeures: number;
    penalitesSurCaution: boolean;
    forfaits: ForfaitDegats[];
  },
) {
  return ecrire(acteur, "parametres.regles", async (tx) => {
    const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
    const forfaits = d.forfaits.map((f) => ({ libelle: f.libelle.trim(), montant: f.montant }));
    const groupe = p.textesGroupe as TextesGroupe;
    verifierForfaits(
      forfaits,
      forfaitsCites([
        ...textesCitant(p.reglement as Reglement, p.textesSite as TextesSite),
        groupe.accroche.texte,
        groupe.presentation.texte,
      ]),
    );
    const data = {
      toleranceRetardMin: d.toleranceRetardMin,
      majorationRetard: majorationDepuisPourcent(d.majorationPourcent),
      seuilDefautRestitutionMin: d.seuilDefautRestitutionHeures * 60,
      penalitesSurCaution: d.penalitesSurCaution,
      forfaitsDegats: forfaits,
    };
    await tx.parametres.update({ where: { id: 1 }, data });
    return data;
  });
}

// ── Catégories ─────────────────────────────────────────────────────────────

const nomCategorie = (nom: string) => {
  const t = nom.trim().replace(/\s+/g, " ");
  if (t.length < 2 || t.length > 40) throw new ErreurMetier("Catégorie : 2 à 40 caractères.");
  return t;
};

async function existeDeja(tx: Tx, type: TypeVehicule, nom: string, sauf?: string) {
  const doublon = await tx.categorie.findFirst({
    where: { type, nom: { equals: nom, mode: "insensitive" }, ...(sauf && { id: { not: sauf } }) },
  });
  if (doublon) throw new ErreurMetier(`La catégorie « ${doublon.nom} » existe déjà.`);
}

export function ajouterCategorie(acteur: CompteConnecte, type: TypeVehicule, nom: string) {
  const n = nomCategorie(nom);
  return ecrire(acteur, "parametres.categorie.ajouter", async (tx) => {
    await existeDeja(tx, type, n);
    const dernier = await tx.categorie.aggregate({ where: { type }, _max: { ordre: true } });
    await tx.categorie.create({ data: { type, nom: n, ordre: (dernier._max.ordre ?? -1) + 1 } });
    return { type, nom: n };
  });
}

export function renommerCategorie(acteur: CompteConnecte, id: string, nom: string) {
  const n = nomCategorie(nom);
  return ecrire(acteur, "parametres.categorie.renommer", async (tx) => {
    const c = await tx.categorie.findUnique({ where: { id } });
    if (!c) throw new ErreurMetier("Catégorie introuvable.");
    await existeDeja(tx, c.type, n, id);
    await tx.categorie.update({ where: { id }, data: { nom: n } });
    return { avant: c.nom, apres: n };
  });
}

export function deplacerCategorie(acteur: CompteConnecte, id: string, delta: -1 | 1) {
  return ecrire(acteur, "parametres.categorie.ordre", async (tx) => {
    const c = await tx.categorie.findUnique({ where: { id } });
    if (!c) throw new ErreurMetier("Catégorie introuvable.");
    const soeurs = await tx.categorie.findMany({
      where: { type: c.type },
      orderBy: [{ ordre: "asc" }, { nom: "asc" }],
    });
    const nouvelOrdre = deplacer(
      soeurs,
      soeurs.findIndex((s) => s.id === id),
      delta,
    );
    // Renumérotation continue 0, 1, 2… : les ordres restent sans doublon.
    for (const [ordre, s] of nouvelOrdre.entries())
      if (s.ordre !== ordre) await tx.categorie.update({ where: { id: s.id }, data: { ordre } });
    return { nom: c.nom, type: c.type };
  });
}

export function supprimerCategorie(acteur: CompteConnecte, id: string) {
  return ecrire(acteur, "parametres.categorie.supprimer", async (tx) => {
    const c = await tx.categorie.findUnique({
      where: { id },
      include: { _count: { select: { vehicules: true } } },
    });
    if (!c) throw new ErreurMetier("Catégorie introuvable.");
    verifierSuppressionCategorie(c.nom, c._count.vehicules);
    await tx.categorie.delete({ where: { id } });
    return { nom: c.nom, type: c.type };
  });
}

// ── Photos de l'accueil ────────────────────────────────────────────────────

/**
 * Photo d'une carte « Trois éléments » de l'accueil : remplacée par `image`, ou retirée
 * (`null`, retour au visuel par défaut). L'ancien fichier est supprimé s'il n'est plus utilisé.
 */
export async function enregistrerPhotoAccueil(
  acteur: CompteConnecte,
  type: TypeVehicule,
  image: ImageEnvoyee | null,
) {
  const cle = image ? await enregistrerFichier("photos", image.octets, image.extension) : null;
  let ancienne: string | undefined;
  try {
    await ecrire(acteur, "parametres.photoAccueil", async (tx) => {
      const p = await tx.parametres.findUniqueOrThrow({ where: { id: 1 } });
      const photos: PhotosAccueil = schemaPhotosAccueil.parse(p.photosAccueil);
      ancienne = photos[type];
      const suivantes = { ...photos, [type]: cle ?? undefined };
      if (!cle) delete suivantes[type];
      await tx.parametres.update({ where: { id: 1 }, data: { photosAccueil: suivantes } });
      return { type, photo: cle ? "remplacée" : "retirée" };
    });
  } catch (e) {
    if (cle) await supprimerFichier(cle);
    throw e;
  }
  if (ancienne && ancienne !== cle) {
    const encoreUtilisee = await prisma.vehicule.count({ where: { photo: ancienne } });
    if (!encoreUtilisee) await supprimerFichier(ancienne);
  }
}
