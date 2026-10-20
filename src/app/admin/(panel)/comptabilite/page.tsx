import type { Metadata } from "next";
import { Suspense } from "react";
import { EcranAVenir } from "@/composants/admin/EcranAVenir";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { exigerSession } from "@/lib/garde";

export const metadata: Metadata = { title: "Comptabilité" };

async function Contenu() {
  await exigerSession();
  return (
    <>
      <EnTetePanel
        titre="Comptabilité"
        fil={[{ libelle: "Comptabilité · FISC" }, { libelle: "Comptabilité" }]}
      />
      <EcranAVenir
        phase={11}
        contenu="Registre hebdomadaire, contrôles, clôture et déclaration FISC."
      />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Contenu />
    </Suspense>
  );
}
