"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { actionCreerContrat } from "@/app/admin/(panel)/contrats/actions";
import { formaterDollars } from "@/domaine/argent";
import { ajouterHeuresHorloge, formaterJourHeure, lignesTarification } from "@/domaine/contrats";
import { depuisHeureServeur, formaterHeureServeurIso } from "@/domaine/dates";
import { calculerTarif, type ResultatTarif } from "@/domaine/tarif";
import type { StatutExemplaire, TypeVehicule } from "@/domaine/types";
import { libelleType } from "@/domaine/unites";
import { Button } from "../../ui/Button";
import { GlassCard } from "../../ui/GlassCard";
import { Icon } from "../../ui/Icon";

export type VehiculeContrat = {
  id: string;
  nom: string;
  type: TypeVehicule;
  categorie: string;
  prixHeure: number;
  prixJour: number;
  caution: number;
  photoUrl: string;
  exemplaires: { id: string; immatriculation: string; statut: StatutExemplaire }[];
};

const STATUTS: Record<StatutExemplaire, string> = {
  DISPONIBLE: "Disponible",
  LOUE: "Loué",
  MAINTENANCE: "Maintenance",
};
const DUREES = [1, 2, 4, 12, 24];

function Champ(props: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  const { label, id, ...input } = props;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="bp-label-champ bp-label-champ--panel">
        {label}
      </label>
      <input id={id} {...input} className="bp-fld bp-fld--panel" />
    </div>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <GlassCard
      as="section"
      variante="admin"
      className="flex flex-col gap-[18px] rounded-[24px] px-7 py-[26px]"
    >
      <h2 className="m-0 titre text-lg font-semibold">{titre}</h2>
      {children}
    </GlassCard>
  );
}

export function FormulaireContrat({
  vehicules,
  fuseau,
  debutParDefaut,
  numero,
}: {
  vehicules: VehiculeContrat[];
  fuseau: string;
  /** « 2026-10-24T22:00 », heure du serveur. */
  debutParDefaut: string;
  numero: string;
}) {
  const router = useRouter();
  const premier =
    vehicules.find((v) => v.exemplaires.some((e) => e.statut === "DISPONIBLE")) ?? vehicules[0];
  const [clientNom, setClientNom] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [vehiculeId, setVehiculeId] = useState(premier?.id ?? "");
  const [exemplaireId, setExemplaireId] = useState(
    premier?.exemplaires.find((e) => e.statut === "DISPONIBLE")?.id ?? "",
  );
  const [debut, setDebut] = useState(debutParDefaut);
  const [fin, setFin] = useState(() =>
    formaterHeureServeurIso(
      ajouterHeuresHorloge(depuisHeureServeur(debutParDefaut, fuseau), 2, fuseau),
      fuseau,
    ),
  );
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, demarrer] = useTransition();

  const vehicule = vehicules.find((v) => v.id === vehiculeId);
  const exemplaire = vehicule?.exemplaires.find((e) => e.id === exemplaireId);

  const calcul = useMemo(():
    { tarif: ResultatTarif; du: Date; au: Date } | { erreur: string } | null => {
    if (!vehicule || !debut || !fin) return null;
    try {
      const du = depuisHeureServeur(debut, fuseau);
      const au = depuisHeureServeur(fin, fuseau);
      return {
        tarif: calculerTarif({
          debut: du,
          fin: au,
          prixHeure: vehicule.prixHeure,
          prixJour: vehicule.prixJour,
          fuseau,
        }),
        du,
        au,
      };
    } catch (e) {
      return { erreur: (e as Error).message };
    }
  }, [vehicule, debut, fin, fuseau]);

  const choisirVehicule = (id: string) => {
    setVehiculeId(id);
    setExemplaireId(
      vehicules.find((v) => v.id === id)?.exemplaires.find((e) => e.statut === "DISPONIBLE")?.id ??
        "",
    );
  };

  const dureeRapide = (heures: number) => {
    try {
      setFin(
        formaterHeureServeurIso(
          ajouterHeuresHorloge(depuisHeureServeur(debut, fuseau), heures, fuseau),
          fuseau,
        ),
      );
    } catch {
      // début invalide : rien à proposer
    }
  };

  const creer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionCreerContrat({ clientNom, clientTelephone, exemplaireId, debut, fin });
      if (r.ok) router.push(`/admin/contrats?cree=${encodeURIComponent(r.donnees.numero)}`);
      else setErreur(r.erreur);
    });

  const pret =
    calcul &&
    "tarif" in calcul &&
    exemplaire?.statut === "DISPONIBLE" &&
    clientNom.trim() &&
    clientTelephone.trim();
  const lignes =
    calcul && "tarif" in calcul && vehicule
      ? lignesTarification(calcul.tarif, vehicule.prixHeure, vehicule.prixJour)
      : null;

  return (
    <form
      className="flex flex-wrap items-start gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        creer();
      }}
    >
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        <Section titre="Client">
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <Champ
              label="Nom du client (RP)"
              id="client-nom"
              required
              autoComplete="off"
              value={clientNom}
              onChange={(e) => setClientNom(e.target.value)}
            />
            <Champ
              label="Téléphone en jeu"
              id="client-telephone"
              required
              inputMode="tel"
              autoComplete="off"
              placeholder="555-0148"
              value={clientTelephone}
              onChange={(e) => setClientTelephone(e.target.value)}
            />
          </div>
        </Section>

        <Section titre="Véhicule">
          <div className="flex flex-col gap-2">
            <label htmlFor="modele" className="bp-label-champ bp-label-champ--panel">
              Modèle
            </label>
            <span className="bp-champ-cadre">
              <select
                id="modele"
                className="bp-fld bp-fld--panel"
                value={vehiculeId}
                onChange={(e) => choisirVehicule(e.target.value)}
              >
                {vehicules.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nom} · {v.categorie} · {formaterDollars(v.prixHeure)}/h
                    {v.exemplaires.every((e) => e.statut !== "DISPONIBLE") ? " · complet" : ""}
                  </option>
                ))}
              </select>
              <Icon nom="chevronBas" taille={16} className="bp-select-chevron" />
            </span>
          </div>
          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="bp-label-champ bp-label-champ--panel mb-2 p-0">Exemplaire</legend>
            <div className="flex flex-wrap gap-3">
              {vehicule?.exemplaires.map((e) => (
                <label
                  key={e.id}
                  className={`bp-choix relative max-w-[200px] min-w-[168px] ${e.statut !== "DISPONIBLE" ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <input
                    type="radio"
                    name="exemplaire"
                    value={e.id}
                    checked={exemplaireId === e.id}
                    disabled={e.statut !== "DISPONIBLE"}
                    onChange={() => setExemplaireId(e.id)}
                  />
                  <span className="text-[14.5px] font-extrabold tracking-[0.04em]">
                    {e.immatriculation}
                  </span>
                  <span className="text-xs text-texte-attenue">{STATUTS[e.statut]}</span>
                </label>
              ))}
            </div>
            {vehicule && vehicule.exemplaires.every((e) => e.statut !== "DISPONIBLE") && (
              <p className="bp-erreur m-0">
                <Icon nom="alerte" taille={14} />
                Aucun exemplaire disponible pour ce modèle.
              </p>
            )}
          </fieldset>
        </Section>

        <Section titre="Période">
          <div className="grid grid-cols-2 gap-4 max-md:grid-cols-1">
            <Champ
              label="Début"
              id="debut"
              type="datetime-local"
              required
              value={debut}
              onChange={(e) => setDebut(e.target.value)}
            />
            <Champ
              label="Fin prévue"
              id="fin"
              type="datetime-local"
              required
              value={fin}
              onChange={(e) => setFin(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Durée rapide">
            <span className="mr-1 text-[13px] text-texte-attenue">Durée rapide</span>
            {DUREES.map((h) => (
              <button
                key={h}
                type="button"
                className="bp-pilule bp-cible"
                aria-pressed={false}
                onClick={() => dureeRapide(h)}
              >
                {h} h
              </button>
            ))}
          </div>
          {calcul && "erreur" in calcul && (
            <p role="alert" className="bp-erreur m-0">
              <Icon nom="alerte" taille={14} />
              {calcul.erreur}
            </p>
          )}
        </Section>
      </div>

      <GlassCard
        as="aside"
        variante="admin"
        aria-label="Récapitulatif"
        className="flex w-full flex-[1_1_340px] flex-col gap-4 rounded-[24px] border-[var(--bp-or-30)] px-[26px] py-6 lg:sticky lg:top-5 lg:max-w-[360px]"
      >
        <div className="flex items-center justify-between">
          <h2 className="m-0 titre text-lg font-semibold">Récapitulatif</h2>
          <span className="libelle text-[10.5px] tracking-[0.2em] chiffres">{numero}</span>
        </div>
        {vehicule && (
          <div className="flex items-center gap-3.5">
            <Image
              src={vehicule.photoUrl}
              alt=""
              width={90}
              height={60}
              className="h-[60px] w-[90px] rounded-[10px] object-cover"
            />
            <span className="flex flex-col gap-1">
              <span className="titre text-[17px] font-semibold">{vehicule.nom}</span>
              <span className="text-[13px] text-texte-attenue">
                {libelleType(vehicule.type)} · {vehicule.categorie}
                {exemplaire ? ` · ${exemplaire.immatriculation}` : ""}
              </span>
            </span>
          </div>
        )}
        {calcul && "tarif" in calcul && vehicule && lignes ? (
          <div aria-live="polite" className="flex flex-col gap-4">
            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] px-4 py-3.5 text-[13.5px]">
              <dt className="text-texte-attenue">Du</dt>
              <dd className="m-0 text-right font-bold">{formaterJourHeure(calcul.du, fuseau)}</dd>
              <dt className="text-texte-attenue">Au</dt>
              <dd className="m-0 text-right font-bold">{formaterJourHeure(calcul.au, fuseau)}</dd>
              <dt className="text-texte-attenue">Durée facturée</dt>
              <dd className="m-0 text-right font-bold">{calcul.tarif.heures} h</dd>
            </dl>
            <div className="flex flex-col gap-1.5 text-[13.5px]">
              {[
                { titre: "Au tarif horaire", ...lignes.horaire },
                { titre: "Au tarif journalier", ...lignes.journalier },
              ].map((l) => (
                <div key={l.titre} className="flex justify-between gap-3">
                  <span className="text-texte-doux">
                    {l.titre} <span className="text-texte-attenue">({l.detail})</span>
                  </span>
                  <span
                    className={`chiffres ${l.applique ? "" : "text-texte-attenue line-through"}`}
                  >
                    {formaterDollars(l.montant)}
                  </span>
                </div>
              ))}
            </div>
            <p className="m-0 flex items-start gap-2.5 rounded-[14px] border border-[var(--bp-or-30)] bg-[var(--bp-or-8)] px-3.5 py-3 text-[13px]">
              <Icon nom="valider" taille={16} className="mt-0.5 text-or-icone" />
              {calcul.tarif.tarifApplique === "JOURNALIER" ? (
                <span>
                  Tarif journalier appliqué · économie de{" "}
                  <strong className="text-or-texte">
                    {formaterDollars(calcul.tarif.economie)}
                  </strong>{" "}
                  pour le client
                </span>
              ) : (
                <span>Tarif horaire appliqué (plus avantageux sur cette durée)</span>
              )}
            </p>
            <div className="flex flex-col gap-2 border-t border-[var(--bp-trait-8)] pt-4 text-[14.5px]">
              <div className="flex justify-between">
                <span className="text-texte-doux">Location</span>
                <span className="font-bold chiffres">{formaterDollars(calcul.tarif.montant)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-texte-doux">
                  Caution <span className="text-texte-attenue">(restituée au retour)</span>
                </span>
                <span className="font-bold chiffres">{formaterDollars(vehicule.caution)}</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 border-t border-[var(--bp-trait-8)] pt-4">
              <span className="flex flex-col gap-1">
                <span className="libelle text-[10.5px] tracking-[0.2em]">Total à encaisser</span>
                <span className="text-xs text-texte-attenue">
                  Location + caution, à la signature
                </span>
              </span>
              <span className="texte-or text-[38px] leading-none font-extrabold chiffres">
                {formaterDollars(calcul.tarif.montant + vehicule.caution)}
              </span>
            </div>
          </div>
        ) : (
          <p className="m-0 text-sm text-texte-attenue">
            Renseignez la période pour calculer le tarif.
          </p>
        )}
        {erreur && (
          <p role="alert" className="bp-erreur m-0">
            <Icon nom="alerte" taille={14} />
            {erreur}
          </p>
        )}
        <Button
          type="submit"
          taille="panel"
          icone="valider"
          disabled={!pret || enCours}
          className="min-h-[52px] w-full text-[15px]"
        >
          Créer le contrat et générer le PDF
        </Button>
        <Button href="/admin/contrats" variante="verre" taille="panel" className="w-full">
          Annuler
        </Button>
      </GlassCard>
    </form>
  );
}
