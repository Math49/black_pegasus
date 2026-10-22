import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { InterrupteurVisibilite } from "@/composants/admin/vehicules/InterrupteurVisibilite";
import { Button, IconButton } from "@/composants/ui/Button";
import { Tag } from "@/composants/ui/Chip";
import { DataGrid } from "@/composants/ui/DataGrid";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon } from "@/composants/ui/Icon";
import { Kpi } from "@/composants/ui/Kpi";
import { Seg } from "@/composants/ui/Seg";
import { formaterDollars } from "@/domaine/argent";
import { disponibilite } from "@/domaine/disponibilite";
import { TYPES } from "@/domaine/flotte";
import type { TypeVehicule } from "@/domaine/types";
import { formaterContenance, libelleType } from "@/domaine/unites";
import { compteursFlotte } from "@/domaine/vehicules";
import { exigerPermission } from "@/lib/garde";
import { urlPhoto } from "@/services/stockage";
import { lireVehiculesAdmin } from "@/services/vehicules";

export const metadata: Metadata = { title: "Véhicules" };

/** « BP SH 01 → 04 » quand les immatriculations se suivent, sinon la liste. */
function resumeImmatriculations(immats: string[]) {
  if (immats.length <= 1) return immats[0] ?? "Aucun exemplaire";
  const prefixe = immats[0].replace(/\d+$/, "");
  if (immats.every((i) => i.startsWith(prefixe) && /\d+$/.test(i))) {
    return `${immats[0]} → ${immats.at(-1)!.slice(prefixe.length)}`;
  }
  return immats.join(", ");
}

async function Contenu({
  searchParams,
}: {
  searchParams: PageProps<"/admin/vehicules">["searchParams"];
}) {
  await exigerPermission("vehicule.consulter");
  const params = await searchParams;
  const type = TYPES.includes(params.type as TypeVehicule) ? (params.type as TypeVehicule) : null;
  const q = String(params.q ?? "").trim();
  const recherche = q.toLowerCase();
  const vehicules = await lireVehiculesAdmin();
  const compteurs = compteursFlotte(vehicules);
  const affiches = vehicules.filter(
    (v) =>
      (!type || v.type === type) &&
      (!recherche ||
        v.nom.toLowerCase().includes(recherche) ||
        v.exemplaires.some((e) => e.immatriculation.toLowerCase().includes(recherche))),
  );
  const lien = (t: TypeVehicule | null) => {
    const p = new URLSearchParams();
    if (t) p.set("type", t);
    if (q) p.set("q", q);
    return `/admin/vehicules${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <EnTetePanel titre="Véhicules" fil={[{ libelle: "Gestion" }, { libelle: "Véhicules" }]} />

      <section
        aria-label="Compteurs de la flotte"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-4"
      >
        <Kpi libelle="Modèles" valeur={compteurs.modeles} />
        <Kpi libelle="Exemplaires" valeur={compteurs.exemplaires} />
        <Kpi libelle="Disponibles" valeur={compteurs.disponibles} valeurOr />
        <Kpi libelle="Loués" valeur={compteurs.loues} />
        <Kpi libelle="En maintenance" valeur={compteurs.maintenance} />
      </section>

      <GlassCard
        as="section"
        variante="admin"
        aria-label="Liste des véhicules"
        className="flex flex-col gap-4 rounded-[24px] px-2 pt-5 pb-2.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3.5 px-3.5">
          <Seg
            libelle="Type de véhicule"
            valeur={type ?? "TOUS"}
            options={[
              { valeur: "TOUS", libelle: "Tous", compteur: vehicules.length, href: lien(null) },
              ...TYPES.map((t) => ({
                valeur: t,
                libelle: libelleType(t, true),
                compteur: vehicules.filter((v) => v.type === t).length,
                href: lien(t),
              })),
            ]}
          />
          <div className="flex flex-wrap items-center gap-3">
            <form role="search" action="/admin/vehicules" className="bp-champ-cadre w-[260px]">
              {type && <input type="hidden" name="type" value={type} />}
              <Icon nom="recherche" taille={15} />
              <input
                type="search"
                name="q"
                defaultValue={q}
                aria-label="Rechercher un véhicule"
                placeholder="Nom, immatriculation…"
                className="bp-fld bp-fld--panel bp-fld--avec-icone h-11"
              />
            </form>
            <Button href="/admin/vehicules/nouveau" taille="panel" icone="plus">
              Ajouter un véhicule
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <DataGrid
            libelle="Véhicules"
            className="min-w-[1080px]"
            hauteurLigne={72}
            vide="Aucun véhicule ne correspond."
            colonnes={[
              { cle: "photo", titre: "Photo", largeur: "72px" },
              { cle: "nom", titre: "Nom", largeur: "minmax(140px,1.2fr)" },
              { cle: "categorie", titre: "Catégorie · type", largeur: "124px" },
              { cle: "places", titre: "Places", largeur: "56px", alignement: "droite" },
              { cle: "contenance", titre: "Contenance", largeur: "96px", alignement: "droite" },
              { cle: "heure", titre: "Prix / h", largeur: "76px", alignement: "droite" },
              { cle: "jour", titre: "Prix / jour", largeur: "88px", alignement: "droite" },
              { cle: "caution", titre: "Caution", largeur: "80px", alignement: "droite" },
              { cle: "exemplaires", titre: "Exemplaires", largeur: "104px" },
              { cle: "site", titre: "Sur le site", largeur: "88px" },
              { cle: "actions", titre: "Modifier", largeur: "40px", titreMasque: true },
            ]}
            lignes={affiches.map((v) => {
              const dispo = disponibilite(v.exemplaires);
              const etat =
                dispo.libres === 0 && v.exemplaires.length > 0
                  ? v.exemplaires.every((e) => e.statut === "MAINTENANCE")
                    ? "Maintenance"
                    : "Loué"
                  : null;
              return {
                cle: v.id,
                cellules: {
                  photo: (
                    <Image
                      src={urlPhoto(v.photo)}
                      alt=""
                      width={72}
                      height={46}
                      className="h-[46px] w-[72px] rounded-[10px] border border-[var(--bp-trait-10)] object-cover"
                    />
                  ),
                  nom: (
                    <span className="flex flex-col gap-0.5">
                      <span className="font-bold">{v.nom}</span>
                      <span className="text-xs text-texte-attenue">
                        {resumeImmatriculations(v.exemplaires.map((e) => e.immatriculation))}
                      </span>
                    </span>
                  ),
                  categorie: (
                    <span className="flex flex-col items-start gap-1">
                      <Tag>{v.categorie.nom}</Tag>
                      <span className="text-xs text-texte-attenue">{libelleType(v.type)}</span>
                    </span>
                  ),
                  places: v.places,
                  contenance: formaterContenance(v.contenanceKg),
                  heure: <span className="font-bold">{formaterDollars(v.prixHeure)}</span>,
                  jour: <span className="font-bold">{formaterDollars(v.prixJour)}</span>,
                  caution: <span className="text-texte-doux">{formaterDollars(v.caution)}</span>,
                  exemplaires: (
                    <span className="flex flex-col gap-1">
                      <span className="text-[13px] font-bold chiffres">
                        {dispo.libres}{" "}
                        <span className="font-medium text-texte-attenue">/ {dispo.total}</span>
                      </span>
                      <span className="flex gap-1" aria-hidden="true">
                        {v.exemplaires.map((e) => (
                          <span
                            key={e.id}
                            className={
                              e.statut === "DISPONIBLE" ? "bp-pip bp-pip--actif" : "bp-pip"
                            }
                          />
                        ))}
                      </span>
                      {etat && <span className="text-[11.5px] text-texte-attenue">{etat}</span>}
                    </span>
                  ),
                  site: <InterrupteurVisibilite id={v.id} nom={v.nom} visible={v.visibleSurSite} />,
                  actions: (
                    <IconButton
                      href={`/admin/vehicules/${v.id}`}
                      libelle={`Modifier ${v.nom}`}
                      icone="crayon"
                      taille="tableau"
                    />
                  ),
                },
              };
            })}
          />
        </div>
      </GlassCard>
    </>
  );
}

export default function PageVehicules({ searchParams }: PageProps<"/admin/vehicules">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu searchParams={searchParams} />
    </Suspense>
  );
}
