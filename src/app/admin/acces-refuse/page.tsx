import type { Metadata } from "next";
import { Suspense } from "react";
import { CarteAcces, NoteAcces } from "@/composants/admin/CarteAcces";
import { Button } from "@/composants/ui/Button";
import { Icon } from "@/composants/ui/Icon";
import { lireCompteConnecte } from "@/lib/garde";
import { deconnexion } from "../actions-session";

export const metadata: Metadata = { title: "Accès non autorisé", robots: { index: false } };

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/acces-refuse">["searchParams"];
}) {
  const { raison } = await searchParams;
  const compte = await lireCompteConnecte();

  if (raison === "role" && compte) {
    return (
      <>
        <NoteAcces icone="information">Cette page est réservée aux administrateurs.</NoteAcces>
        <Button href="/admin" taille="site" icone="flecheGauche" className="w-full">
          Retour au tableau de bord
        </Button>
      </>
    );
  }

  return (
    <>
      <NoteAcces icone="alerte">
        Ce compte Discord n’est pas autorisé, ou il a été désactivé. Demandez à un administrateur de
        l’ajouter ou de le réactiver.
      </NoteAcces>
      <form action={deconnexion} className="w-full">
        <button type="submit" className="bp-btn bp-btn--verre bp-btn--site w-full">
          <Icon nom="deconnexion" taille={20} />
          Se connecter avec un autre compte
        </button>
      </form>
    </>
  );
}

export default function PageAccesRefuse({ searchParams }: PageProps<"/admin/acces-refuse">) {
  return (
    <CarteAcces
      surtitre="Espace privé"
      titre="Accès non autorisé"
      texte="Votre compte ne permet pas d’accéder à cette partie du panel."
    >
      <Suspense fallback={null}>
        <Contenu searchParams={searchParams} />
      </Suspense>
    </CarteAcces>
  );
}
