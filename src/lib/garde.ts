import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cache } from "react";
import { peut, type Action } from "@/domaine/permissions";
import { ErreurMetier, type Role } from "@/domaine/types";
import { auth } from "./auth";
import { prisma } from "./prisma";

// Gardes des pages et Server Actions du panel. Le proxy ne vérifie que la présence d'un
// cookie : chaque page et chaque action rappelle ces fonctions (CONCEPTION § 7).

export type CompteConnecte = {
  id: string;
  discordId: string;
  pseudo: string;
  nomAffiche: string;
  nomRp: string;
  avatarUrl: string | null;
  role: Role;
};

/** Compte de la session, relu en base à chaque requête (un compte désactivé perd l'accès aussitôt). */
export const lireCompteConnecte = cache(async (): Promise<CompteConnecte | null> => {
  // Rendu à la requête avant tout appel à Auth.js (qui tire des valeurs aléatoires).
  await connection();
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  const compte = await prisma.compte.findUnique({ where: { userId } });
  if (!compte?.actif) return null;
  const { id, discordId, pseudo, nomAffiche, nomRp, avatarUrl, role } = compte;
  return { id, discordId, pseudo, nomAffiche, nomRp, avatarUrl, role };
});

/** Pages : session obligatoire, sinon connexion (ou refus si le compte est désactivé). */
export async function exigerSession(): Promise<CompteConnecte> {
  const compte = await lireCompteConnecte();
  if (compte) return compte;
  const session = await auth();
  redirect(session?.user ? "/admin/acces-refuse" : "/admin/connexion");
}

/** Pages réservées : un rôle insuffisant mène à « Accès non autorisé ». */
export async function exigerPermission(action: Action): Promise<CompteConnecte> {
  const compte = await exigerSession();
  if (!peut(compte.role, action)) redirect("/admin/acces-refuse?raison=role");
  return compte;
}

/** Server Actions : lève une erreur métier si la session ou le rôle manque. */
export async function exigerRole(action: Action): Promise<CompteConnecte> {
  const compte = await lireCompteConnecte();
  if (!compte) throw new ErreurMetier("Session expirée : reconnectez-vous.");
  if (!peut(compte.role, action)) throw new ErreurMetier("Action non autorisée pour votre rôle.");
  return compte;
}
