import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { format } from "date-fns";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { FormulaireVehicule } from "@/composants/admin/vehicules/FormulaireVehicule";
import { nomCompte } from "@/domaine/comptes";
import { versHeureServeur } from "@/domaine/dates";
import { peut } from "@/domaine/permissions";
import { exigerPermission } from "@/lib/garde";
import { lireDonneesPanel } from "@/services/panel";
import { urlPhoto } from "@/services/stockage";
import { lireCategories, lireVehiculeAdmin } from "@/services/vehicules";

export const metadata: Metadata = { title: "Modifier le véhicule" };

async function Contenu({ params }: { params: PageProps<"/admin/vehicules/[id]">["params"] }) {
  const compte = await exigerPermission("vehicule.modifier");
  const { id } = await params;
  const [v, categories, d] = await Promise.all([
    lireVehiculeAdmin(id),
    lireCategories(),
    lireDonneesPanel(),
  ]);
  if (!v) notFound();

  const quand = format(versHeureServeur(v.modifieLe, d.fuseau), "dd/MM 'à' HH:mm");
  return (
    <>
      <EnTetePanel
        titre="Modifier le véhicule"
        fil={[{ libelle: "Véhicules", href: "/admin/vehicules" }, { libelle: v.nom }]}
        retour={{ href: "/admin/vehicules", libelle: "Retour aux véhicules" }}
      />
      <FormulaireVehicule
        categories={categories.map(({ id, type, nom }) => ({ id, type, nom }))}
        peutSupprimer={peut(compte.role, "vehicule.supprimer")}
        derniereModification={`Dernière modification : ${v.modifiePar ? `${nomCompte(v.modifiePar)}, ` : ""}${quand}`}
        initial={{
          id: v.id,
          nom: v.nom,
          type: v.type,
          categorieId: v.categorieId,
          places: String(v.places),
          contenanceKg: String(v.contenanceKg),
          prixHeure: String(v.prixHeure),
          prixJour: String(v.prixJour),
          caution: String(v.caution),
          description: v.description,
          visibleSurSite: v.visibleSurSite,
          photoUrl: urlPhoto(v.photo),
          exemplaires: v.exemplaires.map((e) => ({
            cle: e.id,
            id: e.id,
            immatriculation: e.immatriculation,
            statut: e.statut,
            note: e.note ?? "",
            dejaLoue: e._count.contrats > 0,
            contratEnCours: e.contrats[0]
              ? `${e.contrats[0].numero} · ${e.contrats[0].clientNom}`
              : undefined,
          })),
        }}
      />
    </>
  );
}

export default function PageModifierVehicule({ params }: PageProps<"/admin/vehicules/[id]">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu params={params} />
    </Suspense>
  );
}
