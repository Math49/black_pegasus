import "server-only";
import type { Adapter, AdapterAccount, AdapterSession, AdapterUser } from "next-auth/adapters";
import type { PrismaClient } from "@/generated/prisma/client";

// Adaptateur Auth.js minimal sur notre client Prisma 7 (OAuth Discord + sessions en base).
// L'adaptateur officiel ne déclare pas encore Prisma 7.

type Utilisateur = {
  id: string;
  name: string | null;
  email: string | null;
  emailVerified: Date | null;
  image: string | null;
};

// Discord en scope « identify » ne fournit pas d'e-mail : AdapterUser l'exige en type seulement.
const versAdapterUser = (u: Utilisateur): AdapterUser => ({ ...u, email: u.email ?? "" });

export function adaptateurPrisma(prisma: PrismaClient): Adapter {
  return {
    async createUser({ name, email, emailVerified, image }) {
      return versAdapterUser(
        await prisma.user.create({ data: { name, email: email || null, emailVerified, image } }),
      );
    },
    async getUser(id) {
      const u = await prisma.user.findUnique({ where: { id } });
      return u && versAdapterUser(u);
    },
    async getUserByEmail(email) {
      if (!email) return null;
      const u = await prisma.user.findUnique({ where: { email } });
      return u && versAdapterUser(u);
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const compte = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        include: { user: true },
      });
      return compte && versAdapterUser(compte.user);
    },
    async updateUser({ id, name, email, emailVerified, image }) {
      return versAdapterUser(
        await prisma.user.update({
          where: { id },
          data: { name, email: email || undefined, emailVerified, image },
        }),
      );
    },
    async deleteUser(id) {
      await prisma.user.delete({ where: { id } });
    },
    async linkAccount(a: AdapterAccount) {
      await prisma.account.create({
        data: {
          userId: a.userId,
          type: a.type,
          provider: a.provider,
          providerAccountId: a.providerAccountId,
          refresh_token: a.refresh_token,
          access_token: a.access_token,
          expires_at: a.expires_at,
          token_type: a.token_type,
          scope: a.scope,
          id_token: a.id_token,
          session_state: typeof a.session_state === "string" ? a.session_state : null,
        },
      });
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await prisma.account.delete({
        where: { provider_providerAccountId: { provider, providerAccountId } },
      });
    },
    async createSession(s): Promise<AdapterSession> {
      return prisma.session.create({
        data: s,
        select: { sessionToken: true, userId: true, expires: true },
      });
    },
    async getSessionAndUser(sessionToken) {
      const s = await prisma.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      });
      if (!s) return null;
      const { user, ...session } = s;
      return { user: versAdapterUser(user), session };
    },
    async updateSession({ sessionToken, expires, userId }) {
      return prisma.session
        .update({ where: { sessionToken }, data: { expires, userId } })
        .catch(() => null);
    },
    async deleteSession(sessionToken) {
      await prisma.session.deleteMany({ where: { sessionToken } });
    },
  };
}
