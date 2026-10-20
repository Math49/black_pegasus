import type { Metadata } from "next";
import { Suspense } from "react";
import { EcranAVenir } from "@/composants/admin/EcranAVenir";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { exigerSession } from "@/lib/garde";

export const metadata: Metadata = { title: "Solde" };

async function Contenu() {
  await exigerSession();
  return (
    <>
      <EnTetePanel titre="Solde" fil={[{ libelle: "Gestion" }, { libelle: "Solde" }]} />
      <EcranAVenir
        phase={9}
        contenu="Solde, courbe de la semaine, historique des mouvements et justificatifs."
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
