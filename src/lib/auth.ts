import NextAuth from "next-auth";
import Discord from "next-auth/providers/discord";
import { decisionConnexion } from "@/domaine/permissions";
import { adaptateurPrisma } from "./adaptateurAuth";
import { prisma } from "./prisma";

// Auth.js : Discord (scope identify), sessions en base (CONCEPTION § 7, HANDOFF § 7.10).
// Compte reste la table métier ; il est lié à l'utilisateur Auth.js à la connexion.

export const DUREE_SESSION_S = 30 * 24 * 3600;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: adaptateurPrisma(prisma),
  session: { strategy: "database", maxAge: DUREE_SESSION_S },
  providers: [
    Discord({
      authorization: { params: { scope: "identify" } },
      // Discord renvoie désormais « iss=https://discord.com » au retour (RFC 9207) ; sans
      // émetteur déclaré, Auth.js le compare à « https://authjs.dev » et refuse la réponse.
      issuer: "https://discord.com",
    }),
  ],
  pages: { signIn: "/admin/connexion", error: "/admin/connexion" },
  callbacks: {
    async signIn({ account }) {
      if (account?.provider !== "discord") return false;
      const compte = await prisma.compte.findUnique({
        where: { discordId: account.providerAccountId },
      });
      return decisionConnexion(compte) === "autorise" ? true : "/admin/acces-refuse";
    },
  },
  events: {
    // Pseudo, avatar et dernière connexion mis à jour à chaque connexion ; le nom affiché
    // n'est repris de Discord que s'il est vide (compte créé par identifiant seul).
    async signIn({ user, account, profile }) {
      if (account?.provider !== "discord" || !user.id) return;
      const p = (profile ?? {}) as { username?: string; global_name?: string | null };
      const compte = await prisma.compte.findUnique({
        where: { discordId: account.providerAccountId },
      });
      if (!compte) return;
      await prisma.compte.update({
        where: { id: compte.id },
        data: {
          userId: user.id,
          pseudo: p.username ?? compte.pseudo,
          avatarUrl: user.image ?? compte.avatarUrl,
          nomAffiche: compte.nomAffiche || p.global_name || p.username || compte.pseudo,
          derniereConnexion: new Date(),
        },
      });
    },
  },
});
