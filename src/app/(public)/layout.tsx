import { Suspense } from "react";
import { EnTete, EnTeteSquelette } from "@/composants/site/EnTete";
import { PiedDePage } from "@/composants/site/PiedDePage";

// Gabarit du site public : chaque page pose son fond d'ambiance derrière l'en-tête.
export default function LayoutSite({ children }: LayoutProps<"/">) {
  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-clip bg-noir">
      <a
        href="#contenu"
        className="sr-only z-50 rounded-controle bg-noir px-4 py-3 focus:not-sr-only focus:absolute focus:top-2 focus:left-2"
      >
        Aller au contenu
      </a>
      <Suspense fallback={<EnTeteSquelette />}>
        <EnTete />
      </Suspense>
      <main id="contenu" className="flex-1">
        {children}
      </main>
      <Suspense fallback={null}>
        <PiedDePage />
      </Suspense>
    </div>
  );
}
