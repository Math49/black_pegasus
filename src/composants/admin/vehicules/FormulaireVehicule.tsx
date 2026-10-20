"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  actionEnregistrerVehicule,
  actionSupprimerVehicule,
} from "@/app/admin/(panel)/vehicules/actions";
import { disponibilite } from "@/domaine/disponibilite";
import { TYPES } from "@/domaine/flotte";
import { seuilJournalierHeures } from "@/domaine/tarif";
import type { StatutExemplaire, TypeVehicule } from "@/domaine/types";
import { libelleType } from "@/domaine/unites";
import { CarteVehicule } from "../../site/CarteVehicule";
import { Button, IconButton } from "../../ui/Button";
import { GlassCard } from "../../ui/GlassCard";
import { Icon } from "../../ui/Icon";
import { Modal } from "../../ui/Modal";
import { Switch } from "../../ui/Switch";

export type ExemplaireFormulaire = {
  cle: string;
  id?: string;
  immatriculation: string;
  statut: StatutExemplaire;
  note: string;
  /** « CTR-2026-0039 · Chen Wu » si l'exemplaire est loué. */
  contratEnCours?: string;
  dejaLoue: boolean;
};

export type VehiculeFormulaire = {
  id: string | null;
  nom: string;
  type: TypeVehicule;
  categorieId: string;
  places: string;
  contenanceKg: string;
  prixHeure: string;
  prixJour: string;
  caution: string;
  description: string;
  visibleSurSite: boolean;
  photoUrl: string;
  exemplaires: ExemplaireFormulaire[];
};

const nombre = (s: string) => {
  const n = Number(s.replace(/\s/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function Section({
  titre,
  action,
  children,
}: {
  titre: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <GlassCard
      as="section"
      variante="admin"
      className="flex flex-col gap-[18px] rounded-[24px] px-7 py-[26px]"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="m-0 titre text-lg font-semibold">{titre}</h2>
        {action}
      </div>
      {children}
    </GlassCard>
  );
}

function Champ({
  label,
  id,
  prefixe,
  suffixe,
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  id: string;
  prefixe?: string;
  suffixe?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="bp-label-champ bp-label-champ--panel">
        {label}
      </label>
      <span className="bp-champ-cadre">
        {prefixe && (
          <span
            className="pointer-events-none absolute top-[13px] left-3.5 font-extrabold text-texte-attenue"
            aria-hidden="true"
          >
            {prefixe}
          </span>
        )}
        <input
          id={id}
          {...input}
          className={`bp-fld bp-fld--panel ${prefixe ? "pl-8 font-bold" : ""} ${suffixe ? "pr-16" : ""}`}
        />
        {suffixe && (
          <span
            className="pointer-events-none absolute top-3.5 right-3.5 text-[13px] text-texte-attenue"
            aria-hidden="true"
          >
            {suffixe}
          </span>
        )}
      </span>
    </div>
  );
}

let compteurCles = 0;
const nouvelleCle = () => `nouveau-${++compteurCles}`;

export function FormulaireVehicule({
  initial,
  categories,
  peutSupprimer,
  derniereModification,
}: {
  initial: VehiculeFormulaire;
  categories: { id: string; type: TypeVehicule; nom: string }[];
  peutSupprimer: boolean;
  derniereModification: string | null;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [apercuPhoto, setApercuPhoto] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState(false);
  const [enCours, demarrer] = useTransition();

  const choisirPhoto = (f: File | null) => {
    if (apercuPhoto) URL.revokeObjectURL(apercuPhoto);
    setPhoto(f);
    setApercuPhoto(f ? URL.createObjectURL(f) : null);
  };

  const maj = <K extends keyof VehiculeFormulaire>(cle: K, valeur: VehiculeFormulaire[K]) =>
    setV((x) => ({ ...x, [cle]: valeur }));
  const majExemplaire = (cle: string, modif: Partial<ExemplaireFormulaire>) =>
    setV((x) => ({
      ...x,
      exemplaires: x.exemplaires.map((e) => (e.cle === cle ? { ...e, ...modif } : e)),
    }));

  const categoriesDuType = categories.filter((c) => c.type === v.type);
  const categorie = categories.find((c) => c.id === v.categorieId);
  const seuil = useMemo(() => {
    const h = nombre(v.prixHeure);
    const j = nombre(v.prixJour);
    return Number.isSafeInteger(h) && Number.isSafeInteger(j) && h > 0 && j > 0
      ? seuilJournalierHeures(h, j)
      : null;
  }, [v.prixHeure, v.prixJour]);

  const choisirType = (type: TypeVehicule) =>
    setV((x) => ({
      ...x,
      type,
      categorieId:
        categories.find((c) => c.type === type && c.id === x.categorieId)?.id ??
        categories.find((c) => c.type === type)?.id ??
        "",
    }));

  const enregistrer = () =>
    demarrer(async () => {
      setErreur(null);
      const f = new FormData();
      if (v.id) f.set("id", v.id);
      f.set(
        "donnees",
        JSON.stringify({
          nom: v.nom,
          type: v.type,
          categorieId: v.categorieId,
          places: v.places,
          contenanceKg: v.contenanceKg,
          prixHeure: v.prixHeure,
          prixJour: v.prixJour,
          caution: v.caution,
          description: v.description,
          visibleSurSite: v.visibleSurSite,
          exemplaires: v.exemplaires.map(({ id, immatriculation, statut, note }) => ({
            id,
            immatriculation,
            statut,
            note,
          })),
        }),
      );
      if (photo) f.set("photo", photo);
      const r = await actionEnregistrerVehicule(f);
      if (r.ok) router.push("/admin/vehicules");
      else setErreur(r.erreur);
    });

  const supprimer = () =>
    demarrer(async () => {
      const r = await actionSupprimerVehicule(v.id!);
      if (r.ok) router.push("/admin/vehicules");
      else {
        setConfirmation(false);
        setErreur(r.erreur);
      }
    });

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        enregistrer();
      }}
    >
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_620px] flex-col gap-5">
          <Section titre="Informations">
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <Champ
                label="Nom du véhicule"
                id="nom"
                required
                value={v.nom}
                onChange={(e) => maj("nom", e.target.value)}
              />
              <div className="flex flex-col gap-2">
                <label htmlFor="categorie" className="bp-label-champ bp-label-champ--panel">
                  Catégorie
                </label>
                <span className="bp-champ-cadre">
                  <select
                    id="categorie"
                    required
                    className="bp-fld bp-fld--panel"
                    value={v.categorieId}
                    onChange={(e) => maj("categorieId", e.target.value)}
                  >
                    {categoriesDuType.length === 0 && (
                      <option value="">Aucune catégorie pour ce type</option>
                    )}
                    {categoriesDuType.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nom}
                      </option>
                    ))}
                  </select>
                  <Icon nom="chevronBas" taille={16} className="bp-select-chevron" />
                </span>
              </div>
            </div>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className="bp-label-champ bp-label-champ--panel mb-2 p-0">Type</legend>
              <div className="flex gap-3">
                {TYPES.map((t) => (
                  <label key={t} className="bp-sg">
                    <input
                      type="radio"
                      name="type"
                      value={t}
                      checked={v.type === t}
                      onChange={() => choisirType(t)}
                    />
                    {libelleType(t)}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
              <Champ
                label="Places"
                id="places"
                inputMode="numeric"
                suffixe="places"
                required
                value={v.places}
                onChange={(e) => maj("places", e.target.value)}
              />
              <Champ
                label="Contenance"
                id="contenance"
                inputMode="numeric"
                suffixe="kg"
                required
                value={v.contenanceKg}
                onChange={(e) => maj("contenanceKg", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="description" className="bp-label-champ bp-label-champ--panel">
                Présentation sur le site
              </label>
              <textarea
                id="description"
                className="bp-fld bp-fld--panel"
                rows={4}
                value={v.description}
                aria-describedby="description-aide"
                onChange={(e) => maj("description", e.target.value)}
              />
              <span id="description-aide" className="bp-aide">
                Premier paragraphe : accroche de la fiche. « ## Titre » puis un texte pour la
                présentation.
              </span>
            </div>
          </Section>

          <Section titre="Tarifs et caution">
            <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
              <Champ
                label="Prix à l’heure"
                id="prixHeure"
                prefixe="$"
                inputMode="numeric"
                required
                value={v.prixHeure}
                onChange={(e) => maj("prixHeure", e.target.value)}
              />
              <Champ
                label="Prix à la journée"
                id="prixJour"
                prefixe="$"
                inputMode="numeric"
                required
                value={v.prixJour}
                onChange={(e) => maj("prixJour", e.target.value)}
              />
              <Champ
                label="Caution"
                id="caution"
                prefixe="$"
                inputMode="numeric"
                required
                value={v.caution}
                onChange={(e) => maj("caution", e.target.value)}
              />
            </div>
            <p
              className="m-0 flex items-center gap-3 rounded-controle border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] px-4 py-3 text-[13.5px] text-texte-doux"
              aria-live="polite"
            >
              <Icon nom="information" taille={18} className="text-or-icone" />
              {seuil ? (
                <span>
                  Le tarif journalier s’appliquera automatiquement à partir de{" "}
                  <strong className="text-texte">{seuil} heures</strong> de location.
                </span>
              ) : (
                <span>Le tarif journalier ne devient avantageux qu’au-delà de 24 heures.</span>
              )}
            </p>
          </Section>

          <Section
            titre={
              <>
                Exemplaires{" "}
                <span className="text-sm font-medium text-texte-attenue">
                  · {v.exemplaires.length}
                </span>
              </>
            }
            action={
              <Button
                type="button"
                variante="verre"
                taille="panel"
                icone="plus"
                onClick={() =>
                  setV((x) => ({
                    ...x,
                    exemplaires: [
                      ...x.exemplaires,
                      {
                        cle: nouvelleCle(),
                        immatriculation: "",
                        statut: "DISPONIBLE",
                        note: "",
                        dejaLoue: false,
                      },
                    ],
                  }))
                }
              >
                Ajouter un exemplaire
              </Button>
            }
          >
            <div role="table" aria-label="Exemplaires" className="flex flex-col gap-2">
              <div
                role="row"
                className="grid grid-cols-[40px_minmax(140px,1fr)_190px_minmax(140px,1fr)_44px] gap-3 px-3 libelle text-[10.5px] tracking-[0.14em]"
              >
                <span role="columnheader">#</span>
                <span role="columnheader">Immatriculation</span>
                <span role="columnheader">Statut</span>
                <span role="columnheader">Détail</span>
                <span role="columnheader" className="sr-only">
                  Supprimer
                </span>
              </div>
              {v.exemplaires.map((e, i) => (
                <div
                  key={e.cle}
                  role="row"
                  className="grid grid-cols-[40px_minmax(140px,1fr)_190px_minmax(140px,1fr)_44px] items-center gap-3 rounded-[14px] border border-[var(--bp-trait-6)] bg-[var(--bp-voile-3)] px-3 py-2.5"
                >
                  <span role="cell" className="font-bold chiffres text-texte-attenue">
                    {i + 1}
                  </span>
                  <span role="cell">
                    <input
                      aria-label={`Immatriculation de l’exemplaire ${i + 1}`}
                      className="bp-fld bp-fld--panel font-extrabold tracking-[0.06em] uppercase"
                      value={e.immatriculation}
                      readOnly={e.dejaLoue}
                      title={
                        e.dejaLoue
                          ? "Exemplaire présent sur des contrats : immatriculation figée"
                          : undefined
                      }
                      onChange={(ev) => majExemplaire(e.cle, { immatriculation: ev.target.value })}
                    />
                  </span>
                  <span role="cell" className="bp-champ-cadre">
                    <select
                      aria-label={`Statut de l’exemplaire ${i + 1}`}
                      className="bp-fld bp-fld--panel"
                      value={e.statut}
                      disabled={e.statut === "LOUE"}
                      onChange={(ev) =>
                        majExemplaire(e.cle, { statut: ev.target.value as StatutExemplaire })
                      }
                    >
                      {e.statut === "LOUE" && <option value="LOUE">Loué</option>}
                      <option value="DISPONIBLE">Disponible</option>
                      <option value="MAINTENANCE">Maintenance</option>
                    </select>
                    <Icon nom="chevronBas" taille={16} className="bp-select-chevron" />
                  </span>
                  <span role="cell" className="min-w-0">
                    {e.contratEnCours ? (
                      <span className="text-[13px] text-texte-doux">{e.contratEnCours}</span>
                    ) : (
                      <input
                        aria-label={`Détail de l’exemplaire ${i + 1}`}
                        className="bp-fld bp-fld--panel text-[13px]"
                        placeholder="Au ponton, révisé le…"
                        value={e.note}
                        onChange={(ev) => majExemplaire(e.cle, { note: ev.target.value })}
                      />
                    )}
                  </span>
                  <span role="cell">
                    <IconButton
                      libelle={
                        e.dejaLoue
                          ? `${e.immatriculation} a déjà été loué : suppression impossible`
                          : `Supprimer l’exemplaire ${e.immatriculation || i + 1}`
                      }
                      icone="corbeille"
                      taille="tableau"
                      disabled={e.dejaLoue || e.statut === "LOUE"}
                      onClick={() =>
                        setV((x) => ({
                          ...x,
                          exemplaires: x.exemplaires.filter((y) => y.cle !== e.cle),
                        }))
                      }
                    />
                  </span>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <aside
          className="flex min-w-0 flex-[1_1_300px] flex-col gap-5 lg:max-w-[320px]"
          aria-label="Photo et visibilité"
        >
          <GlassCard
            as="section"
            variante="admin"
            className="flex flex-col gap-4 rounded-[24px] p-6"
          >
            <h2 className="m-0 titre text-lg font-semibold">Photo</h2>
            <div className="relative aspect-[16/10] overflow-hidden rounded-[14px] border border-[var(--bp-trait-10)] bg-surface">
              <Image
                src={apercuPhoto ?? v.photoUrl}
                alt={`Photo du ${v.nom || "véhicule"}`}
                fill
                sizes="320px"
                className="object-cover"
                unoptimized={Boolean(apercuPhoto)}
              />
            </div>
            <label
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-[14px] border border-dashed border-[var(--bp-trait-18)] px-4 py-3 text-center text-[13.5px] text-texte-doux hover:border-[var(--bp-or-45)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) choisirPhoto(f);
              }}
            >
              <Icon nom="envoyer" taille={18} />
              <span className="flex-1">
                {photo
                  ? photo.name
                  : "Remplacer · glisser une image détourée (PNG, JPG, WEBP, 10 Mo)"}
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={(e) => choisirPhoto(e.target.files?.[0] ?? null)}
              />
            </label>
          </GlassCard>

          <GlassCard
            as="section"
            variante="admin"
            className="flex flex-col gap-4 rounded-[24px] p-6"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--bp-trait-8)] pb-4">
              <span className="flex flex-col gap-0.5">
                <span className="font-bold">Visible sur le site</span>
                <span className="text-[12.5px] text-texte-attenue">
                  Affiché dans le catalogue public
                </span>
              </span>
              <Switch
                libelleAccessible="Visible sur le site"
                coche={v.visibleSurSite}
                onChange={(c) => maj("visibleSurSite", c)}
              />
            </div>
            <span className="libelle text-[10.5px] tracking-[0.2em]">Aperçu de la carte</span>
            <div className="pointer-events-none" inert>
              <CarteVehicule
                format="reference"
                vehicule={{
                  slug: "apercu",
                  nom: v.nom || "Nouveau véhicule",
                  type: v.type,
                  categorie: categorie?.nom ?? "",
                  prixHeure: Math.max(0, Math.trunc(nombre(v.prixHeure))),
                  prixJour: Math.max(0, Math.trunc(nombre(v.prixJour))),
                  places: Math.max(0, Math.trunc(nombre(v.places))),
                  contenanceKg: Math.max(0, Math.trunc(nombre(v.contenanceKg))),
                  photoUrl: apercuPhoto ?? v.photoUrl,
                }}
                disponibilite={disponibilite(v.exemplaires)}
              />
            </div>
          </GlassCard>
        </aside>
      </div>

      {erreur && (
        <p role="alert" className="bp-erreur m-0 px-1">
          <Icon nom="alerte" taille={14} />
          {erreur}
        </p>
      )}

      <GlassCard
        variante="admin"
        className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-5 py-3.5"
      >
        <div>
          {peutSupprimer && v.id && (
            <Button
              type="button"
              variante="danger"
              taille="panel"
              icone="corbeille"
              onClick={() => setConfirmation(true)}
            >
              Supprimer le véhicule
            </Button>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {derniereModification && (
            <span className="text-[12.5px] text-texte-attenue">{derniereModification}</span>
          )}
          <Button href="/admin/vehicules" variante="verre" taille="panel">
            Annuler
          </Button>
          <Button type="submit" taille="panel" icone="valider" disabled={enCours}>
            Enregistrer
          </Button>
        </div>
      </GlassCard>

      <Modal
        ouvert={confirmation}
        onFermer={() => setConfirmation(false)}
        surtitre="Véhicules"
        titre={`Supprimer ${v.nom} ?`}
        actions={
          <>
            <Button
              type="button"
              variante="verre"
              taille="panel"
              onClick={() => setConfirmation(false)}
            >
              Annuler
            </Button>
            <Button
              type="button"
              variante="danger"
              taille="panel"
              icone="corbeille"
              disabled={enCours}
              onClick={supprimer}
            >
              Supprimer le véhicule
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm leading-[1.6] text-texte-doux">
          Le véhicule disparaît du site et du panel. Ses contrats passés restent lisibles dans
          l’historique et la comptabilité.
        </p>
      </Modal>
    </form>
  );
}
