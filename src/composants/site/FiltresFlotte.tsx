"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { formaterDollars } from "@/domaine/argent";
import {
  ecrireFiltres,
  TRANCHES_CONTENANCE,
  TRANCHES_PLACES,
  type FiltresFlotte as Filtres,
  type TrancheContenance,
  type TranchePlaces,
  type Tri,
} from "@/domaine/flotte";
import { cx } from "@/lib/classes";
import { Checkbox } from "../ui/Field";
import { Icon } from "../ui/Icon";
import { Pilules } from "../ui/Seg";
import { Switch } from "../ui/Switch";

const LIBELLES_PLACES: Record<TranchePlaces, string> = {
  "1-2": "1 – 2",
  "3-6": "3 – 6",
  "7+": "7 +",
};
const LIBELLES_CONTENANCE: Record<TrancheContenance, string> = {
  "-100": "< 100 kg",
  "100-500": "100 – 500 kg",
  "500+": "500 kg +",
};

function useFiltres(filtres: Filtres) {
  const router = useRouter();
  const [enCours, demarrer] = useTransition();
  const appliquer = (modif: Partial<Filtres>) =>
    demarrer(() =>
      router.push(`/flotte?${ecrireFiltres({ ...filtres, ...modif })}`, { scroll: false }),
    );
  return { appliquer, enCours };
}

/** Colonne de filtres de la flotte (maquette 02). Tous les filtres vivent dans l'URL. */
export function FiltresFlotte({
  filtres,
  categories,
  histogramme,
  nombreActifs,
}: {
  filtres: Filtres;
  categories: { nom: string; nombre: number }[];
  histogramme: { min: number; max: number; barres: { haut: number; jusqua: number }[] };
  nombreActifs: number;
}) {
  const { appliquer, enCours } = useFiltres(filtres);
  const [ouvert, setOuvert] = useState(false);
  const [prix, setPrix] = useState(filtres.prixMax ?? histogramme.max);
  const idPrix = useId();
  const noms = categories.map((c) => c.nom);
  const cochees = filtres.categories ?? noms;
  const plafond = Math.min(prix, histogramme.max);

  const basculerCategorie = (nom: string, coche: boolean) => {
    const suivantes = coche ? [...cochees, nom] : cochees.filter((c) => c !== nom);
    const toutes = noms.every((n) => suivantes.includes(n));
    appliquer({ categories: toutes ? null : noms.filter((n) => suivantes.includes(n)) });
  };

  const validerPrix = () => appliquer({ prixMax: plafond >= histogramme.max ? null : plafond });

  return (
    <div className="flex w-full flex-col gap-4 lg:max-w-[300px] lg:flex-[1_1_280px]">
      <button
        type="button"
        aria-expanded={ouvert}
        aria-controls="filtres-flotte"
        onClick={() => setOuvert(!ouvert)}
        className="bp-btn bp-btn--verre bp-btn--site-petit self-start lg:hidden"
      >
        <Icon nom="etiquette" taille={18} />
        Filtres{nombreActifs > 0 && ` (${nombreActifs})`}
      </button>

      <aside
        id="filtres-flotte"
        aria-label="Filtres"
        aria-busy={enCours}
        className={cx(
          "glass-site flex-col gap-[26px] rounded-[24px] px-6 py-[26px] transition-opacity lg:flex",
          ouvert ? "flex" : "hidden",
          enCours && "opacity-80",
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 titre text-2xl font-semibold">Filtres</h2>
          <Link
            href={`/flotte?type=${filtres.type}`}
            scroll={false}
            className="flex min-h-11 items-center text-xs font-bold tracking-[0.12em] text-or-texte uppercase hover:text-texte"
          >
            Effacer
          </Link>
        </div>

        <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
          <legend className="mb-2.5 p-0 libelle text-texte-doux">Catégorie</legend>
          {categories.map((c) => (
            <div key={c.nom} className="flex items-center justify-between gap-2.5">
              <Checkbox
                label={c.nom}
                checked={cochees.includes(c.nom)}
                onChange={(e) => basculerCategorie(c.nom, e.target.checked)}
                className="min-h-10 flex-1"
              />
              <span
                className="text-[13px] text-texte-attenue"
                aria-label={`${c.nombre} modèle${c.nombre > 1 ? "s" : ""}`}
              >
                {c.nombre}
              </span>
            </div>
          ))}
        </fieldset>

        <div className="h-px bg-[var(--bp-trait-8)]" />

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2.5 p-0 libelle text-texte-doux">Nombre de places</legend>
          <Pilules
            libelle="Nombre de places"
            valeur={filtres.places ?? "tous"}
            onChange={(v) => appliquer({ places: v === "tous" ? null : (v as TranchePlaces) })}
            options={[
              { valeur: "tous", libelle: "Tous" },
              ...(Object.keys(TRANCHES_PLACES) as TranchePlaces[]).map((t) => ({
                valeur: t,
                libelle: LIBELLES_PLACES[t],
              })),
            ]}
          />
        </fieldset>

        <fieldset className="m-0 flex flex-col gap-3 border-0 p-0">
          <legend className="mb-2.5 p-0 libelle text-texte-doux">Contenance</legend>
          <Pilules
            libelle="Contenance"
            valeur={filtres.contenance ?? "toutes"}
            onChange={(v) =>
              appliquer({ contenance: v === "toutes" ? null : (v as TrancheContenance) })
            }
            options={[
              { valeur: "toutes", libelle: "Toutes" },
              ...(Object.keys(TRANCHES_CONTENANCE) as TrancheContenance[]).map((t) => ({
                valeur: t,
                libelle: LIBELLES_CONTENANCE[t],
              })),
            ]}
          />
        </fieldset>

        <div className="h-px bg-[var(--bp-trait-8)]" />

        {histogramme.barres.length > 0 && (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <label htmlFor={idPrix} className="libelle text-texte-doux">
                Prix à l’heure
              </label>
              <span className="text-[13px] font-bold chiffres">
                {formaterDollars(histogramme.min)} – {formaterDollars(plafond)}
              </span>
            </div>
            <div aria-hidden="true" className="flex h-14 items-end gap-1 px-0.5">
              {histogramme.barres.map((b, i) => (
                <span
                  key={i}
                  className={cx(
                    "flex-1 rounded-[2px]",
                    b.jusqua - (histogramme.max - histogramme.min) / histogramme.barres.length <=
                      plafond
                      ? "bp-barre-active"
                      : "bp-barre",
                  )}
                  style={{ height: `${Math.max(8, b.haut * 100)}%` }}
                />
              ))}
            </div>
            <input
              id={idPrix}
              type="range"
              className="bp-curseur"
              min={histogramme.min}
              max={histogramme.max}
              step={50}
              value={plafond}
              aria-valuetext={`Jusqu’à ${formaterDollars(plafond)} de l’heure`}
              onChange={(e) => setPrix(Number(e.target.value))}
              onPointerUp={validerPrix}
              onKeyUp={validerPrix}
            />
          </div>
        )}

        <div className="h-px bg-[var(--bp-trait-8)]" />

        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold" aria-hidden="true">
            Disponible uniquement
          </span>
          <Switch
            variante="site"
            libelleAccessible="Disponible uniquement"
            coche={filtres.dispo}
            onChange={(dispo) => appliquer({ dispo })}
          />
        </div>
      </aside>
    </div>
  );
}

const LIBELLES_TRI: Record<Tri, string> = {
  recommandes: "Recommandés",
  "prix-croissant": "Prix croissant",
  "prix-decroissant": "Prix décroissant",
  places: "Nombre de places",
};

export function TriFlotte({ filtres }: { filtres: Filtres }) {
  const { appliquer } = useFiltres(filtres);
  return (
    <label className="flex items-center gap-2.5 text-[13px] text-texte-attenue">
      Trier par
      <span className="bp-champ-cadre">
        <select
          className="bp-fld bp-fld--site h-11 w-auto pr-10 text-sm font-semibold"
          value={filtres.tri}
          onChange={(e) => appliquer({ tri: e.target.value as Tri })}
        >
          {(Object.keys(LIBELLES_TRI) as Tri[]).map((t) => (
            <option key={t} value={t}>
              {LIBELLES_TRI[t]}
            </option>
          ))}
        </select>
        <Icon nom="chevronBas" taille={15} className="bp-select-chevron" />
      </span>
    </label>
  );
}
