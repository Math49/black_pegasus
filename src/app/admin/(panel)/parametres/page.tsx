import type { Metadata } from "next";
import { Suspense } from "react";
import { EcranAVenir } from "@/composants/admin/EcranAVenir";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { exigerPermission } from "@/lib/garde";

export const metadata: Metadata = { title: "Paramètres du site" };

async function Contenu() {
  await exigerPermission("parametres.gerer");
  return (
    <>
      <EnTetePanel
        titre="Paramètres du site"
        fil={[{ libelle: "Administration" }, { libelle: "Paramètres du site" }]}
      />
      <EcranAVenir
        phase={12}
        contenu="Agence, textes du site, règlement, règles de location et catégories."
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
