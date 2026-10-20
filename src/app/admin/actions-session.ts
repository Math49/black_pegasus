"use server";

import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decisionConnexion } from "@/domaine/permissions";
import { DUREE_SESSION_S, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function connexionDiscord() {
  await signIn("discord", { redirectTo: "/admin" });
}

export async function deconnexion() {
  await signOut({ redirectTo: "/admin/connexion" });
}

/**
 * Connexion de développement : ouvre une vraie session en base pour un compte du seed, sans
 * passer par Discord. Refusée hors `NODE_ENV=development`.
 */
export async function connexionDeveloppement(formData: FormData) {
  if (process.env.NODE_ENV !== "development")
    throw new Error("Connexion de développement indisponible.");
  const compteId = String(formData.get("compteId") ?? "");
  const compte = await prisma.compte.findUnique({ where: { id: compteId } });
  if (decisionConnexion(compte) !== "autorise" || !compte) redirect("/admin/acces-refuse");

  const userId =
    compte.userId ??
    (
      await prisma.user.create({
        data: { name: compte.nomAffiche || compte.pseudo, image: compte.avatarUrl },
      })
    ).id;
  const expires = new Date(Date.now() + DUREE_SESSION_S * 1000);
  const sessionToken = randomUUID();
  await prisma.$transaction([
    prisma.compte.update({
      where: { id: compte.id },
      data: { userId, derniereConnexion: new Date() },
    }),
    prisma.session.create({ data: { sessionToken, userId, expires } }),
  ]);
  (await cookies()).set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  redirect("/admin");
}
