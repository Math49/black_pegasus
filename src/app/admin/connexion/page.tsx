import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CarteAcces, NoteAcces } from "@/composants/admin/CarteAcces";
import { Icon } from "@/composants/ui/Icon";
import { LIBELLES_ROLE } from "@/domaine/permissions";
import { lireCompteConnecte } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { connexionDeveloppement, connexionDiscord } from "../actions-session";

export const metadata: Metadata = { title: "Connexion", robots: { index: false } };

/** Mode de développement : choix d'un compte du seed (NODE_ENV=development uniquement). */
async function ConnexionDeveloppement() {
  if (process.env.NODE_ENV !== "development") return null;
  const comptes = await prisma.compte.findMany({ orderBy: [{ role: "asc" }, { ajouteLe: "asc" }] });
  return (
    <form action={connexionDeveloppement} className="flex w-full flex-col gap-2.5 text-left">
      <span className="libelle">Développement · se connecter en tant que</span>
      <div className="flex flex-col gap-1.5">
        {comptes.map((c) => (
          <button
            key={c.id}
            type="submit"
            name="compteId"
            value={c.id}
            className="bp-btn bp-btn--verre bp-btn--panel justify-between"
          >
            <span>{c.nomAffiche || `Compte ${c.discordId}`}</span>
            <span className="text-xs font-semibold text-texte-attenue">
              {LIBELLES_ROLE[c.role]}
              {!c.actif && " · inactif"}
            </span>
          </button>
        ))}
      </div>
    </form>
  );
}

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/connexion">["searchParams"];
}) {
  if (await lireCompteConnecte()) redirect("/admin");
  const { error } = await searchParams;
  const discordConfigure = Boolean(process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET);

  return (
    <>
      {error && (
        <p role="alert" className="bp-erreur m-0 text-left">
          <Icon nom="alerte" taille={14} />
          {error === "trop"
            ? "Trop de tentatives de connexion : patientez une minute."
            : "La connexion avec Discord n’a pas abouti. Réessayez."}
        </p>
      )}
      <form action={connexionDiscord} className="w-full">
        <button
          type="submit"
          className="bp-btn bp-btn--or bp-btn--site mt-1.5 min-h-14 w-full text-[15.5px]"
          disabled={!discordConfigure}
        >
          <Icon nom="discussion" taille={22} />
          Se connecter avec Discord
        </button>
      </form>
      <NoteAcces>
        Votre identifiant Discord doit avoir été ajouté par un administrateur. Aucun mot de passe
        n’est stocké.
      </NoteAcces>
      {!discordConfigure && process.env.NODE_ENV === "development" && (
        <NoteAcces icone="information">
          Discord n’est pas configuré : renseignez AUTH_DISCORD_ID et AUTH_DISCORD_SECRET dans .env.
        </NoteAcces>
      )}
      <ConnexionDeveloppement />
    </>
  );
}

export default function PageConnexion({ searchParams }: PageProps<"/admin/connexion">) {
  return (
    <CarteAcces
      surtitre="Espace privé"
      titre="Administration"
      texte="Accès réservé aux comptes autorisés de la maison Black Pégasus."
    >
      <Suspense fallback={<div className="h-14 w-full" />}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </CarteAcces>
  );
}
