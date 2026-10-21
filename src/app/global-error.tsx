"use client";

import "./globals.css";
import { PageErreur } from "@/composants/site/PageIntrouvable";
import { Button } from "@/composants/ui/Button";
import { variablesPolices } from "./polices";

// Erreur dans le gabarit racine lui-même : la page reconstruit <html> et <body>.
export default function ErreurGlobale({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="fr" className={variablesPolices}>
      <body className="min-h-dvh bg-noir">
        <main>
          <PageErreur
            code="Erreur 500"
            titre="Un incident est survenu"
            texte="Le site n’a pas pu s’afficher. Réessayez dans un instant."
            actions={
              <Button type="button" onClick={reset}>
                Réessayer
              </Button>
            }
          />
        </main>
      </body>
    </html>
  );
}
