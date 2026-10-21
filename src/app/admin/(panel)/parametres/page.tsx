import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { GestionCategories } from "@/composants/admin/parametres/GestionCategories";
import {
  FormulaireAgence,
  FormulaireRegles,
} from "@/composants/admin/parametres/FormulairesSimples";
import {
  FormulaireReglement,
  FormulaireTextes,
} from "@/composants/admin/parametres/FormulairesTextes";
import { GlassCard } from "@/composants/ui/GlassCard";
import { majorationEnPourcent } from "@/domaine/parametres";
import type { ForfaitDegats, TypeVehicule } from "@/domaine/types";
import { exigerPermission } from "@/lib/garde";
import { lireParametresAdmin } from "@/services/parametres";
import type { Reglement, TextesSite } from "@/services/site";

export const metadata: Metadata = { title: "Paramètres" };

const SOMMAIRE = [
  ["agence", "Agence"],
  ["textes", "Textes du site"],
  ["reglement", "Règlement"],
  ["regles", "Règles de location"],
  ["categories", "Catégories"],
] as const;

async function Contenu() {
  await exigerPermission("parametres.gerer");
  const { p, categories } = await lireParametresAdmin();
  return (
    <>
      <EnTetePanel
        titre="Paramètres du site"
        fil={[{ libelle: "Administration" }, { libelle: "Paramètres" }]}
      />
      <GlassCard
        as="nav"
        variante="admin"
        aria-label="Sections des paramètres"
        className="flex flex-wrap items-center gap-2 px-4 py-3"
      >
        {SOMMAIRE.map(([id, libelle]) => (
          <Link key={id} href={`#${id}`} className="bp-pilule inline-flex min-h-11 items-center">
            {libelle}
          </Link>
        ))}
        <span className="ml-auto text-[12.5px] text-texte-attenue">
          Les modifications sont visibles sur le site dès l’enregistrement.
        </span>
      </GlassCard>

      <FormulaireAgence
        initial={{
          telephone: p.telephoneAgence,
          horaires: p.horaires,
          immatriculation: p.numeroImmatriculationEntreprise,
          fuseau: p.fuseauServeur,
        }}
      />
      <FormulaireTextes initial={p.textesSite as TextesSite} />
      <FormulaireReglement initial={p.reglement as Reglement} />
      <FormulaireRegles
        initial={{
          toleranceRetardMin: p.toleranceRetardMin,
          majorationPourcent: majorationEnPourcent(p.majorationRetard),
          seuilDefautRestitutionHeures: Math.round(p.seuilDefautRestitutionMin / 60),
          penalitesSurCaution: p.penalitesSurCaution,
          forfaits: p.forfaitsDegats as ForfaitDegats[],
        }}
      />
      <GestionCategories
        categories={categories.map((c) => ({
          id: c.id,
          type: c.type as TypeVehicule,
          nom: c.nom,
          vehicules: c._count.vehicules,
        }))}
      />
    </>
  );
}

export default function PageParametres() {
  return (
    <Suspense fallback={null}>
      <Contenu />
    </Suspense>
  );
}
