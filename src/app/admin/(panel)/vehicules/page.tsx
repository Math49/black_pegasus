import type { Metadata } from "next";
import { Suspense } from "react";
import { EcranAVenir } from "@/composants/admin/EcranAVenir";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { exigerSession } from "@/lib/garde";

export const metadata: Metadata = { title: "Véhicules" };

async function Contenu() {
  await exigerSession();
  return (
    <>
      <EnTetePanel titre="Véhicules" fil={[{ libelle: "Gestion" }, { libelle: "Véhicules" }]} />
      <EcranAVenir
        phase={7}
        contenu="Liste de la flotte, formulaire, exemplaires, photos et visibilité sur le site."
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
