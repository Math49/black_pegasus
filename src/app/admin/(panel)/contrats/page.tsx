import type { Metadata } from "next";
import { Suspense } from "react";
import { EcranAVenir } from "@/composants/admin/EcranAVenir";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { exigerSession } from "@/lib/garde";

export const metadata: Metadata = { title: "Contrats" };

async function Contenu() {
  await exigerSession();
  return (
    <>
      <EnTetePanel titre="Contrats" fil={[{ libelle: "Gestion" }, { libelle: "Contrats" }]} />
      <EcranAVenir phase={8} contenu="Contrats en cours et terminés, création, clôture et PDF." />
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
