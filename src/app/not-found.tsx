import type { Metadata } from "next";
import { PageIntrouvable } from "@/composants/site/PageIntrouvable";

export const metadata: Metadata = { title: "Page introuvable", robots: { index: false } };

export default function Introuvable() {
  return (
    <main className="bg-noir">
      <PageIntrouvable
        titre="Page introuvable"
        texte="L’adresse demandée n’existe pas ou n’existe plus."
      />
    </main>
  );
}
