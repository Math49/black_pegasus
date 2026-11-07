import { ChargementPanel } from "@/composants/admin/ChargementPanel";
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
import { PhotosAccueil } from "@/composants/admin/parametres/PhotosAccueil";
import { FormulaireFiliale } from "@/composants/admin/parametres/FormulaireFiliale";
import { FormulaireTextesGroupe } from "@/composants/admin/parametres/FormulaireTextesGroupe";
import { FONDS_TYPES } from "@/composants/site/Mise";
import { GlassCard } from "@/composants/ui/GlassCard";
import { majorationEnPourcent } from "@/domaine/parametres";
import type { ForfaitDegats, TypeVehicule } from "@/domaine/types";
import { exigerPermission } from "@/lib/garde";
import { lireParametresAdmin } from "@/services/parametres";
import {
  schemaPhotosAccueil,
  schemaTextesGroupe,
  type Reglement,
  type TextesSite,
} from "@/services/site";
import { urlPhoto } from "@/services/stockage";

export const metadata: Metadata = { title: "Paramètres" };

const SOMMAIRE = [
  ["agence", "Groupe"],
  ["textes-groupe", "Accueil du groupe"],
  ["filiales", "Filiales"],
  ["textes", "Textes du site"],
  ["reglement", "Règlement"],
  ["regles", "Règles de location"],
  ["categories", "Catégories"],
  ["photos", "Photos de l’accueil"],
] as const;

async function Contenu() {
  await exigerPermission("parametres.gerer");
  const { p, filiales, categories } = await lireParametresAdmin();
  const photos = schemaPhotosAccueil.parse(p.photosAccueil);
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
          nomEntreprise: p.nomEntreprise,
          immatriculation: p.numeroImmatriculationEntreprise,
          fuseau: p.fuseauServeur,
        }}
      />
      <FormulaireTextesGroupe initial={schemaTextesGroupe.parse(p.textesGroupe)} />
      <div id="filiales" className="flex scroll-mt-5 flex-col gap-5">
        <h2 className="m-0 titre text-xl font-semibold">Filiales</h2>
        {filiales.map((f) => (
          <FormulaireFiliale key={f.code} initial={f} />
        ))}
      </div>
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
      <PhotosAccueil
        photos={(["BATEAU", "AVION", "HELICOPTERE"] as const).map((type) => {
          const cle = photos[type];
          return { type, url: cle ? urlPhoto(cle) : null, parDefaut: FONDS_TYPES[type] };
        })}
      />
    </>
  );
}

export default function PageParametres() {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu />
    </Suspense>
  );
}
