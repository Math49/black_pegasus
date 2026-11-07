import { Suspense } from "react";
import { exigerPermission } from "@/lib/garde";
import { lireFormationAdmin } from "@/services/formation";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { GestionFormation } from "@/composants/admin/formation/GestionFormation";

export const metadata = { title: "Permis de formation" };
async function Contenu() {
  await exigerPermission("formation.gerer");
  const { domaines, permis } = await lireFormationAdmin();
  return (
    <>
      <EnTetePanel
        titre="Permis de formation"
        fil={[{ libelle: "Formation" }, { libelle: "Permis" }]}
      />
      <GestionFormation domaines={domaines} permis={permis} />
    </>
  );
}
export default function PagePermis() {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu />
    </Suspense>
  );
}
