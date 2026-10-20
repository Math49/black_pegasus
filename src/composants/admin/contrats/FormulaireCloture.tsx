"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { actionAnnulerContrat, actionCloturerContrat } from "@/app/admin/(panel)/contrats/actions";
import { formaterDollars } from "@/domaine/argent";
import { bilanCloture } from "@/domaine/contrats";
import { depuisHeureServeur } from "@/domaine/dates";
import { formaterDuree } from "@/domaine/notifications";
import type { ForfaitDegats } from "@/domaine/types";
import { Button } from "../../ui/Button";
import { Checkbox } from "../../ui/Field";
import { GlassCard } from "../../ui/GlassCard";
import { Icon } from "../../ui/Icon";
import { Modal } from "../../ui/Modal";

export type ContratCloture = {
  id: string;
  numero: string;
  vehiculeNom: string;
  prixHeure: number;
  caution: number;
  /** ISO UTC */
  finPrevue: string;
};

type Regles = {
  toleranceRetardMin: number;
  majorationRetard: number;
  seuilDefautRestitutionMin: number;
  penalitesSurCaution: boolean;
};

const LIBELLES = {
  PENALITE: "Pénalité",
  CAUTION_RENDUE: "Caution rendue",
} as const;

export function FormulaireCloture({
  contrat,
  forfaits,
  regles,
  fuseau,
  retourParDefaut,
  peutAnnuler,
  children,
}: {
  contrat: ContratCloture;
  forfaits: ForfaitDegats[];
  regles: Regles;
  fuseau: string;
  retourParDefaut: string;
  peutAnnuler: boolean;
  /** Carte « Contrat » affichée en tête de la colonne principale. */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [retour, setRetour] = useState(retourParDefaut);
  const [coches, setCoches] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [maintenance, setMaintenance] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirmerAnnulation, setConfirmerAnnulation] = useState(false);
  const [enCours, demarrer] = useTransition();

  const bilan = useMemo(() => {
    try {
      return bilanCloture({
        contrat: { ...contrat, finPrevue: new Date(contrat.finPrevue) },
        retourReel: depuisHeureServeur(retour, fuseau),
        forfaitsCoches: forfaits.filter((f) => coches.includes(f.libelle)),
        regles,
        fuseau,
      });
    } catch {
      return null;
    }
  }, [contrat, retour, coches, forfaits, regles, fuseau]);

  const cloturer = () =>
    demarrer(async () => {
      setErreur(null);
      const r = await actionCloturerContrat(contrat.id, {
        retourReel: retour,
        forfaits: coches,
        note,
        maintenance,
      });
      if (r.ok) router.push("/admin/contrats");
      else setErreur(r.erreur);
    });

  const annuler = () =>
    demarrer(async () => {
      const r = await actionAnnulerContrat(contrat.id);
      if (r.ok) router.push("/admin/contrats");
      else {
        setConfirmerAnnulation(false);
        setErreur(r.erreur);
      }
    });

  const retard = bilan?.retard;
  return (
    <form
      className="flex flex-wrap items-start gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        cloturer();
      }}
    >
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        {children}
        <GlassCard
          as="section"
          variante="admin"
          className="flex flex-col gap-[18px] rounded-[24px] px-7 py-[26px]"
        >
          <h2 className="m-0 titre text-lg font-semibold">Retour du véhicule</h2>
          <div className="grid grid-cols-2 items-end gap-4 max-md:grid-cols-1">
            <div className="flex flex-col gap-2">
              <label htmlFor="retour" className="bp-label-champ bp-label-champ--panel">
                Heure de retour réelle
              </label>
              <input
                id="retour"
                type="datetime-local"
                required
                className="bp-fld bp-fld--panel"
                value={retour}
                onChange={(e) => setRetour(e.target.value)}
              />
            </div>
            {retard && (
              <div
                aria-live="polite"
                className={`flex min-h-[46px] items-center gap-3 rounded-controle border px-4 py-2 ${
                  retard.heuresFacturees > 0
                    ? "border-[var(--bp-alerte-45)] bg-[var(--bp-alerte-7)]"
                    : "border-[var(--bp-trait-10)] bg-[var(--bp-voile-3)]"
                }`}
              >
                <Icon
                  nom={retard.heuresFacturees > 0 ? "alerte" : "horloge"}
                  taille={18}
                  className={retard.heuresFacturees > 0 ? "text-alerte-texte" : "text-argent-1"}
                />
                <span className="flex flex-col">
                  <span className="font-bold">
                    {retard.minutes > 0
                      ? `Retard : ${formaterDuree(retard.minutes)}`
                      : "Rendu à l’heure"}
                  </span>
                  <span className="text-xs text-texte-attenue">
                    Tolérance de {regles.toleranceRetardMin} min
                    {retard.heuresFacturees > 0 &&
                      ` · ${retard.heuresFacturees} heure${retard.heuresFacturees > 1 ? "s" : ""} entamée${retard.heuresFacturees > 1 ? "s" : ""} facturée${retard.heuresFacturees > 1 ? "s" : ""}`}
                  </span>
                </span>
              </div>
            )}
          </div>
          {retard?.defautRestitution && (
            <p role="alert" className="bp-erreur m-0">
              <Icon nom="alerte" taille={14} />
              Plus de {Math.round(regles.seuilDefautRestitutionMin / 60)} h de retard : défaut de
              restitution, à traiter avec le gérant.
            </p>
          )}

          <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
            <legend className="bp-label-champ bp-label-champ--panel mb-2 p-0">
              Dégâts constatés à l’état des lieux
            </legend>
            {forfaits.map((f) => (
              <div
                key={f.libelle}
                className="flex items-center justify-between gap-3 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] px-4"
              >
                <Checkbox
                  label={f.libelle}
                  className="min-h-[50px] flex-1"
                  checked={coches.includes(f.libelle)}
                  onChange={(e) =>
                    setCoches((c) =>
                      e.target.checked ? [...c, f.libelle] : c.filter((x) => x !== f.libelle),
                    )
                  }
                />
                <span className="text-[13.5px] chiffres text-texte-doux">
                  +{formaterDollars(f.montant)}
                </span>
              </div>
            ))}
          </fieldset>

          <div className="flex flex-col gap-2">
            <label htmlFor="note" className="bp-label-champ bp-label-champ--panel">
              Note d’état des lieux
            </label>
            <textarea
              id="note"
              rows={3}
              className="bp-fld bp-fld--panel"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <Checkbox
            label="Envoyer l’exemplaire en maintenance après le retour"
            checked={maintenance}
            onChange={(e) => setMaintenance(e.target.checked)}
          />
        </GlassCard>
      </div>

      <GlassCard
        as="aside"
        variante="admin"
        aria-label="Bilan de clôture"
        className="flex w-full flex-[1_1_340px] flex-col gap-4 rounded-[24px] border-[var(--bp-or-30)] px-[26px] py-6 lg:sticky lg:top-5 lg:max-w-[360px]"
      >
        <h2 className="m-0 titre text-lg font-semibold">Bilan de clôture</h2>
        {bilan ? (
          <div aria-live="polite" className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5 text-[14px]">
              <div className="flex justify-between gap-3">
                <span className="text-texte-doux">
                  Retard facturé{" "}
                  {bilan.retard.heuresFacturees > 0 && (
                    <span className="text-texte-attenue">
                      ({bilan.retard.heuresFacturees} h × {formaterDollars(contrat.prixHeure)} ×{" "}
                      {String(1 + regles.majorationRetard).replace(".", ",")})
                    </span>
                  )}
                </span>
                <span className="font-bold chiffres">{formaterDollars(bilan.retard.penalite)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-texte-doux">Dégâts</span>
                <span className="font-bold chiffres">{formaterDollars(bilan.penaliteDegats)}</span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 border-t border-[var(--bp-trait-8)] pt-4">
              <span className="flex flex-col gap-1">
                <span className="libelle text-[10.5px] tracking-[0.2em]">
                  Pénalités à encaisser
                </span>
                <span className="text-xs text-texte-attenue">
                  {regles.penalitesSurCaution
                    ? "Retenues sur la caution"
                    : "Réglées par le client à l’agence"}
                </span>
              </span>
              <span className="texte-or text-[34px] leading-none font-extrabold chiffres">
                {formaterDollars(bilan.penalites)}
              </span>
            </div>
            <div className="flex items-end justify-between gap-3 border-t border-[var(--bp-trait-8)] pt-4">
              <span className="flex flex-col gap-1">
                <span className="libelle text-[10.5px] tracking-[0.2em]">Caution restituée</span>
                <span className="text-xs text-texte-attenue">
                  {bilan.cautionRestituee === contrat.caution
                    ? "Intégrale, rendue en main propre"
                    : "Diminuée des pénalités"}
                </span>
              </span>
              <span className="text-[28px] leading-none font-extrabold chiffres">
                {formaterDollars(bilan.cautionRestituee)}
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] px-4 py-3.5">
              <span className="libelle text-[10.5px] tracking-[0.2em]">Mouvements générés</span>
              {bilan.mouvements.map((m, i) => (
                <div key={i} className="flex justify-between gap-3 text-[13px]">
                  <span className="whitespace-nowrap text-texte-doux">
                    {LIBELLES[m.categorie as keyof typeof LIBELLES] ?? m.categorie} ·{" "}
                    {contrat.numero}
                  </span>
                  <span
                    className={`font-bold chiffres ${m.sens === "ENTREE" ? "text-or-texte" : "text-texte"}`}
                  >
                    {formaterDollars(m.sens === "ENTREE" ? m.montant : -m.montant, { signe: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="m-0 text-sm text-texte-attenue">Indiquez l’heure de retour.</p>
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
          disabled={!bilan || enCours}
          className="min-h-[52px] w-full text-[15px]"
        >
          Clôturer le contrat
        </Button>
        <Button href="/admin/contrats" variante="verre" taille="panel" className="w-full">
          Annuler
        </Button>
        {peutAnnuler && (
          <Button
            type="button"
            variante="danger"
            taille="panel-petit"
            icone="corbeille"
            className="self-center"
            onClick={() => setConfirmerAnnulation(true)}
          >
            Annuler ce contrat (saisi par erreur)
          </Button>
        )}
      </GlassCard>

      <Modal
        ouvert={confirmerAnnulation}
        onFermer={() => setConfirmerAnnulation(false)}
        surtitre={contrat.numero}
        titre="Annuler ce contrat ?"
        actions={
          <>
            <Button
              type="button"
              variante="verre"
              taille="panel"
              onClick={() => setConfirmerAnnulation(false)}
            >
              Garder le contrat
            </Button>
            <Button
              type="button"
              variante="danger"
              taille="panel"
              icone="corbeille"
              disabled={enCours}
              onClick={annuler}
            >
              Annuler le contrat
            </Button>
          </>
        }
      >
        <p className="m-0 text-sm leading-[1.6] text-texte-doux">
          Réservé aux contrats saisis par erreur. Ses mouvements (caution et location) sont
          contre-passés dans le registre, l’exemplaire redevient disponible. Rien n’est effacé.
        </p>
      </Modal>
    </form>
  );
}
