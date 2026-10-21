import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import type { Metadata } from "next";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { FormulaireContrat } from "@/composants/admin/contrats/FormulaireContrat";
import { formaterHeureServeurIso, versHeureServeur } from "@/domaine/dates";
import { exigerPermission } from "@/lib/garde";
import { prochainNumeroContrat } from "@/services/contrats";
import { lireDonneesPanel } from "@/services/panel";
import { urlPhoto } from "@/services/stockage";
import { lireVehiculesAdmin } from "@/services/vehicules";

export const metadata: Metadata = { title: "Nouveau contrat" };

async function Contenu() {
  await exigerPermission("contrat.creer");
  const [vehicules, d] = await Promise.all([lireVehiculesAdmin(), lireDonneesPanel()]);
  const numero = await prochainNumeroContrat(d.maintenant, d.fuseau);

  // Début proposé : l'heure pleine suivante, à l'heure du serveur.
  const debut = versHeureServeur(d.maintenant, d.fuseau);
  debut.setMinutes(0, 0, 0);
  debut.setHours(debut.getHours() + 1);

  return (
    <>
      <EnTetePanel
        titre="Nouveau contrat"
        fil={[{ libelle: "Contrats", href: "/admin/contrats" }, { libelle: numero }]}
        retour={{ href: "/admin/contrats", libelle: "Retour aux contrats" }}
      />
      <FormulaireContrat
        numero={numero}
        fuseau={d.fuseau}
        debutParDefaut={formaterHeureServeurIso(new Date(debut.getTime()), d.fuseau)}
        vehicules={vehicules.map((v) => ({
          id: v.id,
          nom: v.nom,
          type: v.type,
          categorie: v.categorie.nom,
          prixHeure: v.prixHeure,
          prixJour: v.prixJour,
          caution: v.caution,
          photoUrl: urlPhoto(v.photo),
          exemplaires: v.exemplaires.map((e) => ({
            id: e.id,
            immatriculation: e.immatriculation,
            statut: e.statut,
          })),
        }))}
      />
    </>
  );
}

export default function PageNouveauContrat() {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu />
    </Suspense>
  );
}
