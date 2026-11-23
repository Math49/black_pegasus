import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { GestionCategories } from "@/composants/admin/parametres/GestionCategories";
import {
  FormulaireImpot,
  GestionCategoriesMouvement,
} from "@/composants/admin/parametres/GestionComptabilite";
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
import { Button } from "@/composants/ui/Button";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Seg } from "@/composants/ui/Seg";
import { LIBELLES_FILIALE } from "@/domaine/filiales";
import { majorationEnPourcent } from "@/domaine/parametres";
import type { CodeFiliale, ForfaitDegats, TypeVehicule } from "@/domaine/types";
import { exigerPermission } from "@/lib/garde";
import { lireCategoriesAdmin } from "@/services/categories";
import { lireParametresAdmin } from "@/services/parametres";
import {
  schemaPhotosAccueil,
  schemaTextesGroupe,
  type Reglement,
  type TextesSite,
} from "@/services/site";
import { urlPhoto } from "@/services/stockage";

export const metadata: Metadata = { title: "Paramètres" };

/**
 * Un onglet pour le groupe, un par filiale (CONCEPTION-FILIALES § 8). Les règles, textes et
 * règlement de Location restent stockés dans `Parametres` (option retenue en F-6 : aucune
 * migration de données) mais se règlent dans l'onglet Location.
 */
const ONGLETS = [
  { valeur: "groupe", libelle: "Groupe" },
  { valeur: "comptabilite", libelle: "Comptabilité" },
  { valeur: "location", libelle: LIBELLES_FILIALE.BPL, code: "BPL" },
  { valeur: "formation", libelle: LIBELLES_FILIALE.BPF, code: "BPF" },
  { valeur: "cards", libelle: LIBELLES_FILIALE.BPC, code: "BPC" },
] as const satisfies readonly { valeur: string; libelle: string; code?: CodeFiliale }[];

type Onglet = (typeof ONGLETS)[number]["valeur"];

/** Sommaire des sections longues de l'onglet Location. */
const SOMMAIRE_LOCATION = [
  ["filiale-BPL", "Identité et contact"],
  ["textes", "Textes du site"],
  ["reglement", "Règlement"],
  ["regles", "Règles de location"],
  ["categories", "Catégories"],
  ["photos", "Photos de l’accueil"],
] as const;

/** Renvoi vers l'écran du panel qui gère le catalogue d'une filiale. */
function CarteCatalogue({
  titre,
  texte,
  href,
  action,
}: {
  titre: string;
  texte: string;
  href: string;
  action: string;
}) {
  return (
    <GlassCard
      as="section"
      variante="admin"
      aria-label={titre}
      className="flex flex-wrap items-center justify-between gap-4 p-6"
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <h2 className="m-0 titre text-lg font-semibold">{titre}</h2>
        <p className="m-0 max-w-[620px] text-sm text-texte-doux">{texte}</p>
      </div>
      <Button href={href} variante="verre" taille="panel" iconeFin="flecheDroite">
        {action}
      </Button>
    </GlassCard>
  );
}

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/parametres">["searchParams"];
}) {
  await exigerPermission("parametres.gerer");
  const params = await searchParams;
  const onglet: Onglet = ONGLETS.some((o) => o.valeur === params.onglet)
    ? (params.onglet as Onglet)
    : "groupe";
  const [{ p, filiales, categories }, categoriesMouvement] = await Promise.all([
    lireParametresAdmin(),
    lireCategoriesAdmin(),
  ]);
  const photos = schemaPhotosAccueil.parse(p.photosAccueil);
  const filiale = (code: CodeFiliale) => {
    const f = filiales.find((x) => x.code === code);
    return f ? <FormulaireFiliale key={f.code} initial={f} /> : null;
  };

  return (
    <>
      <EnTetePanel
        titre="Paramètres du site"
        fil={[{ libelle: "Administration" }, { libelle: "Paramètres" }]}
      />
      <GlassCard variante="admin" className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <Seg
          libelle="Paramètres du groupe et des filiales"
          valeur={onglet}
          options={ONGLETS.map((o) => ({
            valeur: o.valeur,
            libelle: o.libelle,
            href: `/admin/parametres?onglet=${o.valeur}`,
          }))}
        />
        <span className="ml-auto text-[12.5px] text-texte-attenue">
          Les modifications sont visibles sur le site dès l’enregistrement.
        </span>
      </GlassCard>

      {onglet === "groupe" && (
        <>
          <FormulaireAgence
            initial={{
              nomEntreprise: p.nomEntreprise,
              immatriculation: p.numeroImmatriculationEntreprise,
              fuseau: p.fuseauServeur,
            }}
          />
          <FormulaireTextesGroupe initial={schemaTextesGroupe.parse(p.textesGroupe)} />
        </>
      )}

      {onglet === "comptabilite" && (
        <>
          <FormulaireImpot initial={p.tauxImpot} />
          <GestionCategoriesMouvement
            categories={categoriesMouvement.map((c) => ({
              id: c.id,
              nom: c.nom,
              sens: c.sens,
              filiale: c.filiale,
              justificatifObligatoire: c.justificatifObligatoire,
              systeme: c.systeme,
              archivee: c.archivee,
              mouvements: c._count.mouvements,
            }))}
          />
        </>
      )}

      {onglet === "location" && (
        <>
          <nav aria-label="Sections de Location" className="flex flex-wrap gap-2">
            {SOMMAIRE_LOCATION.map(([id, libelle]) => (
              <Link
                key={id}
                href={`#${id}`}
                className="bp-pilule inline-flex min-h-11 items-center"
              >
                {libelle}
              </Link>
            ))}
          </nav>
          {filiale("BPL")}
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
      )}

      {onglet === "formation" && (
        <>
          {filiale("BPF")}
          <CarteCatalogue
            titre="Domaines et permis"
            texte="Le catalogue de Formation (domaines, permis, modalités et tarifs) se gère dans l’écran Permis."
            href="/admin/formation/permis"
            action="Gérer les permis"
          />
        </>
      )}

      {onglet === "cards" && (
        <>
          {filiale("BPC")}
          <CarteCatalogue
            titre="Catégories et cartes"
            texte="Le catalogue de Cards (catégories, cartes, prix et stock) se gère dans l’écran Cartes ; les ventes dans l’écran Ventes."
            href="/admin/cards"
            action="Gérer les cartes"
          />
        </>
      )}
    </>
  );
}

export default function PageParametres({ searchParams }: PageProps<"/admin/parametres">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
