import type { Metadata } from "next";
import { Suspense } from "react";
import { EcranAVenir } from "@/composants/admin/EcranAVenir";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { exigerPermission } from "@/lib/garde";

export const metadata: Metadata = { title: "Comptes" };

async function Contenu() {
  await exigerPermission("compte.gerer");
  return (
    <>
      <EnTetePanel titre="Comptes" fil={[{ libelle: "Administration" }, { libelle: "Comptes" }]} />
      <EcranAVenir
        phase={6}
        contenu="Comptes autorisés, rôles, activation et journal d’activité."
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
