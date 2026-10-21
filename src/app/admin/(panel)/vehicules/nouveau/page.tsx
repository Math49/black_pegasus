import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { FormulaireVehicule } from "@/composants/admin/vehicules/FormulaireVehicule";
import { exigerPermission } from "@/lib/garde";
import { urlPhoto } from "@/services/stockage";
import { lireCategories } from "@/services/vehicules";

export const metadata: Metadata = { title: "Nouveau véhicule" };

async function Contenu() {
  await exigerPermission("vehicule.creer");
  const categories = await lireCategories();
  const premiere = categories.find((c) => c.type === "BATEAU") ?? categories[0];
  return (
    <>
      <EnTetePanel
        titre="Nouveau véhicule"
        fil={[{ libelle: "Véhicules", href: "/admin/vehicules" }, { libelle: "Nouveau" }]}
        retour={{ href: "/admin/vehicules", libelle: "Retour aux véhicules" }}
      />
      <FormulaireVehicule
        categories={categories.map(({ id, type, nom }) => ({ id, type, nom }))}
        peutSupprimer={false}
        derniereModification={null}
        initial={{
          id: null,
          nom: "",
          type: premiere?.type ?? "BATEAU",
          categorieId: premiere?.id ?? "",
          places: "",
          contenanceKg: "",
          prixHeure: "",
          prixJour: "",
          caution: "",
          description: "",
          visibleSurSite: true,
          photoUrl: urlPhoto(null),
          exemplaires: [
            {
              cle: "nouveau-0",
              immatriculation: "",
              statut: "DISPONIBLE",
              note: "",
              dejaLoue: false,
            },
          ],
        }}
      />
    </>
  );
}

export default function PageNouveauVehicule() {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu />
    </Suspense>
  );
}
