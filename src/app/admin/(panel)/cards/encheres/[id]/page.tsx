import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ChargementPanel } from "@/composants/admin/ChargementPanel";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { ActionsEnchere, EcarterOffre } from "@/composants/admin/cards/ActionsEnchere";
import { CompteARebours } from "@/composants/ui/CompteARebours";
import { DataGrid } from "@/composants/ui/DataGrid";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Statut } from "@/composants/ui/Statut";
import { formaterDollars } from "@/domaine/argent";
import { nomCompte } from "@/domaine/comptes";
import { formaterHeure, formaterJourCourt } from "@/domaine/dates";
import {
  etatEnchere,
  finInitiale,
  formaterDureeEnchere,
  LIBELLES_ETAT_ENCHERE,
  meilleureOffre,
  montantMinimum,
} from "@/domaine/encheres";
import { peut } from "@/domaine/permissions";
import { exigerPermission } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { lireEnchereAdmin } from "@/services/encheres";
import { lireDonneesPanel } from "@/services/panel";

export const metadata = { title: "Enchère" };

async function Contenu({ params }: { params: PageProps<"/admin/cards/encheres/[id]">["params"] }) {
  const compte = await exigerPermission("enchere.gerer");
  const { id } = await params;
  const [e, instant, d] = await Promise.all([
    lireEnchereAdmin(id),
    maintenant(),
    lireDonneesPanel(),
  ]);
  if (!e) notFound();
  const etat = etatEnchere(e, e.offres, instant);
  const meilleure = meilleureOffre(e.offres);
  const quand = (date: Date) =>
    `${formaterJourCourt(date, d.fuseau)} · ${formaterHeure(date, d.fuseau)}`;
  const peutEcarter = peut(compte.role, "enchere.ecarter") && e.statut === "OUVERTE";

  return (
    <>
      <EnTetePanel
        titre={`Enchère · ${e.carte.nom}`}
        fil={[
          { libelle: "Cards" },
          { libelle: "Cartes", href: "/admin/cards" },
          { libelle: "Enchère" },
        ]}
        retour={{ href: "/admin/cards", libelle: "Retour aux cartes" }}
      />
      <GlassCard
        as="section"
        variante="admin"
        aria-label="Aperçu de l’enchère"
        className="grid grid-cols-[220px_minmax(0,1fr)] gap-8 p-7"
      >
        <div className="relative aspect-[63/88] overflow-hidden rounded-[14px] bg-noir">
          {e.carte.photo ? (
            <Image
              // Même aperçu que le site : la version filigranée.
              src={`/api/cartes/${e.carte.id}/photo`}
              alt={`Carte ${e.carte.nom}`}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <Image
              src="/images/logos/bp-cards.webp"
              alt=""
              fill
              sizes="220px"
              className="object-contain p-10 opacity-80"
            />
          )}
        </div>
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="libelle text-[10.5px] tracking-[0.2em]">{e.carte.categorie.nom}</span>
            <Statut
              ton={etat === "en_cours" ? "ok" : etat === "a_conclure" ? "or" : "attenue"}
              point
            >
              {LIBELLES_ETAT_ENCHERE[etat]}
            </Statut>
          </div>
          <dl className="m-0 grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <dt className="libelle text-[10.5px] tracking-[0.2em]">
                {meilleure ? "Meilleure offre" : "Mise à prix"}
              </dt>
              <dd className="m-0 texte-or text-[34px] leading-none font-extrabold chiffres">
                {formaterDollars(meilleure?.montant ?? e.montantDepart)}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="libelle text-[10.5px] tracking-[0.2em]">Temps restant</dt>
              <dd className="m-0 text-2xl font-extrabold chiffres">
                {etat === "en_cours" ? (
                  <CompteARebours
                    fin={e.finPrevue.toISOString()}
                    finDuree={finInitiale(e.debut, e.dureeHeures).toISOString()}
                    maintenant={instant.toISOString()}
                  />
                ) : (
                  "Terminée"
                )}
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="libelle text-[10.5px] tracking-[0.2em]">Fin de la durée</dt>
              <dd className="m-0 text-base font-bold chiffres">
                {quand(finInitiale(e.debut, e.dureeHeures))}
              </dd>
              {e.finPrevue > finInitiale(e.debut, e.dureeHeures) && (
                <dd className="m-0 text-sm text-texte-doux">
                  Prolongée jusqu’au {quand(e.finPrevue)}
                </dd>
              )}
            </div>
          </dl>
          <p className="m-0 text-sm text-texte-doux">
            Départ {formaterDollars(e.montantDepart)} · pas {formaterDollars(e.pasMinimum)} · durée{" "}
            {formaterDureeEnchere(e.dureeHeures)} · temps additionnel {e.tempsAdditionnelMin} min ·
            prochaine offre minimale {formaterDollars(montantMinimum(e, e.offres))}. Ouverte par{" "}
            {nomCompte(e.creePar)} le {quand(e.debut)}.
          </p>
          {e.vente && (
            <p className="m-0 text-sm text-texte-doux">Vente enregistrée : {e.vente.numero}.</p>
          )}
          {(etat === "en_cours" || etat === "a_conclure" || etat === "sans_offre") && (
            <ActionsEnchere
              enchere={{
                id: e.id,
                carteNom: e.carte.nom,
                etat,
                gagnante:
                  etat === "a_conclure" && meilleure
                    ? {
                        id: meilleure.id,
                        nom: meilleure.nom,
                        montant: formaterDollars(meilleure.montant),
                      }
                    : null,
              }}
            />
          )}
        </div>
      </GlassCard>

      <GlassCard
        as="section"
        variante="admin"
        aria-labelledby="titre-offres"
        className="flex flex-col gap-3 rounded-[24px] px-2 pt-[18px] pb-2"
      >
        <div className="flex flex-col gap-1 px-3">
          <h2 id="titre-offres" className="m-0 titre text-lg font-semibold">
            Offres · {e.offres.length}
          </h2>
          <span className="text-[13px] text-texte-attenue">
            Noms et téléphones réservés au panel : le site n’affiche que les montants.
          </span>
        </div>
        <DataGrid
          libelle="Offres de l’enchère"
          vide="Aucune offre pour l’instant."
          colonnes={[
            { cle: "date", titre: "Date", largeur: "minmax(140px,1fr)" },
            { cle: "nom", titre: "Enchérisseur", largeur: "minmax(140px,1.2fr)" },
            { cle: "telephone", titre: "Téléphone", largeur: "120px" },
            { cle: "montant", titre: "Montant", largeur: "110px", alignement: "droite" },
            { cle: "statut", titre: "Statut", largeur: "minmax(150px,1fr)" },
            ...(peutEcarter
              ? [{ cle: "action" as const, titre: "Action", largeur: "120px", titreMasque: true }]
              : []),
          ]}
          lignes={e.offres.map((o) => ({
            cle: o.id,
            ton: o.invalidee ? ("inactif" as const) : undefined,
            cellules: {
              date: <span className="chiffres">{quand(o.date)}</span>,
              nom: <span className="font-bold">{o.nom}</span>,
              telephone: <span className="chiffres">{o.telephone}</span>,
              montant: (
                <span className="font-extrabold chiffres">{formaterDollars(o.montant)}</span>
              ),
              statut: o.invalidee ? (
                <Statut ton="attenue" icone="fermer">
                  {o.motifEcart === "defaillant" ? "Défaillant" : "Écartée"}
                  {o.ecarteePar ? ` · ${nomCompte(o.ecarteePar)}` : ""}
                </Statut>
              ) : o.id === meilleure?.id ? (
                <Statut ton="or" point>
                  {etat === "en_cours" ? "Meilleure offre" : "Gagnante"}
                </Statut>
              ) : (
                <Statut ton="ok" point>
                  Retenue
                </Statut>
              ),
              action:
                peutEcarter && !o.invalidee ? (
                  <EcarterOffre
                    offre={{ id: o.id, nom: o.nom, montant: formaterDollars(o.montant) }}
                  />
                ) : undefined,
            },
          }))}
        />
      </GlassCard>
    </>
  );
}

export default function PageEnchere({ params }: PageProps<"/admin/cards/encheres/[id]">) {
  return (
    <Suspense fallback={<ChargementPanel />}>
      <Contenu params={params} />
    </Suspense>
  );
}
