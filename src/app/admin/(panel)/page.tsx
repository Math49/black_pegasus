import type { Metadata } from "next";
import { Suspense } from "react";
import { EcranAVenir } from "@/composants/admin/EcranAVenir";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { formaterDateLongue, salutation } from "@/domaine/dates";
import { exigerSession } from "@/lib/garde";
import { lireDonneesPanel } from "@/services/panel";

export const metadata: Metadata = { title: "Tableau de bord" };

async function Contenu() {
  const [compte, d] = await Promise.all([exigerSession(), lireDonneesPanel()]);
  const prenom = (compte.nomAffiche || compte.pseudo).split(/\s+/)[0];
  const date = formaterDateLongue(d.maintenant, d.fuseau);
  return (
    <>
      <EnTetePanel
        surtitre={date.charAt(0).toUpperCase() + date.slice(1)}
        titre={`${salutation(d.maintenant, d.fuseau)}${prenom ? `, ${prenom}` : ""}`}
      />
      <EcranAVenir
        phase={10}
        contenu="Solde, raccourcis, indicateurs de la semaine, contrats en cours et recettes des 8 dernières semaines."
      />
    </>
  );
}

export default function PageTableauDeBord() {
  return (
    <Suspense fallback={null}>
      <Contenu />
    </Suspense>
  );
}
