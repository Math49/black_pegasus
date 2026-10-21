"use client";

import { useEffect } from "react";
import { PageErreur } from "@/composants/site/PageIntrouvable";
import { Button } from "@/composants/ui/Button";

// Erreur inattendue (500) : message sobre, sans détail technique, avec un nouvel essai.
export default function Erreur({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="bg-noir">
      <PageErreur
        code="Erreur 500"
        titre="Un incident est survenu"
        texte={`La page n’a pas pu s’afficher. Réessayez dans un instant ; si le problème continue, prévenez le gérant${error.digest ? ` (référence ${error.digest})` : ""}.`}
        actions={
          <>
            <Button type="button" onClick={reset} icone="valider">
              Réessayer
            </Button>
            <Button href="/" variante="verre">
              Retour à l’accueil
            </Button>
          </>
        }
      />
    </main>
  );
}
