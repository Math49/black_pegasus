import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formaterDollars } from "@/domaine/argent";
import { formaterDateComplete, lignesTarification } from "@/domaine/contrats";
import { versHeureServeur } from "@/domaine/dates";
import { tarifPourHeures } from "@/domaine/tarif";
import { nomCompte } from "@/domaine/comptes";
import { lireContrat } from "@/services/contrats";
import { EN_TETE_JETON, jetonPdf } from "@/services/pdf";
import { lireParametresSite } from "@/services/site";

// Gabarit du PDF de contrat (maquette 30), imprimé en A4 par services/pdf.ts.

const or =
  "linear-gradient(100deg, var(--bp-gold-1) 0%, var(--bp-gold-2) 48%, var(--bp-gold-3) 100%)";
const texteOr = {
  background: or,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
} as const;

function Valeur({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-[3px]">
      <span className="pdf-k">{k}</span>
      <span className="pdf-v">{v}</span>
    </div>
  );
}

async function Contrat({ params }: { params: Promise<{ id: string }> }) {
  if ((await headers()).get(EN_TETE_JETON) !== jetonPdf()) notFound();
  const { id } = await params;
  const [c, p] = await Promise.all([lireContrat(id), lireParametresSite()]);
  if (!c) notFound();

  const v = c.exemplaire.vehicule;
  const tarif = tarifPourHeures(c.heuresFacturees, c.prixHeure, c.prixJour);
  const lignes = lignesTarification(tarif, c.prixHeure, c.prixJour, true);
  const etabli = format(versHeureServeur(c.creeLe, p.fuseauServeur), "EEEE dd/MM/yyyy 'à' HH:mm", {
    locale: fr,
  });
  const signataire = nomCompte(c.creePar);
  const conditions = [
    "Le locataire présente une pièce d’identité et la licence ou le permis requis.",
    "Le véhicule est rendu au point de remise, propre, réservoir plein.",
    `Tolérance de ${p.toleranceRetardMin} min ; au-delà, chaque heure entamée est due au tarif horaire majoré de ${Math.round(p.majorationRetard * 100)} %.`,
    "Les dégâts constatés à l’état des lieux sont facturés au locataire.",
    "Tout usage lors d’une activité illégale entraîne la perte de la caution.",
    "Le règlement complet des locations fait partie intégrante du présent contrat.",
  ];

  return (
    <div className="pdf-feuille">
      <header className="relative flex items-center justify-between gap-6 overflow-hidden bg-noir px-12 pt-[26px] pb-6">
        <svg
          viewBox="0 0 300 300"
          aria-hidden="true"
          className="absolute -top-[150px] -right-[70px] size-[300px]"
        >
          <circle
            cx="150"
            cy="150"
            r="148"
            fill="none"
            style={{ stroke: "var(--bp-gold-3)" }}
            strokeOpacity=".35"
          />
          <circle
            cx="150"
            cy="150"
            r="120"
            fill="none"
            style={{ stroke: "var(--bp-gold-3)" }}
            strokeOpacity=".18"
          />
        </svg>
        <div className="flex items-center gap-4">
          <Image
            src="/images/bp-logo.png"
            alt="Black Pégasus – American Transports"
            width={84}
            height={84}
            unoptimized
          />
          <div className="flex flex-col gap-1">
            <span className="mot-symbole text-xl" style={texteOr}>
              BLACK PÉGASUS
            </span>
            <span className="text-[9.5px] font-bold tracking-[0.34em] text-texte-doux">
              AMERICAN TRANSPORTS
            </span>
            <span className="mt-1 text-[11.5px] text-texte-nav">
              Réservations par téléphone en jeu : {p.telephone}
            </span>
          </div>
        </div>
        <div className="relative flex flex-col items-end gap-1.5 text-right">
          <span className="text-[10.5px] font-extrabold tracking-[0.26em] text-texte-doux">
            CONTRAT DE LOCATION
          </span>
          <span className="text-[26px] font-extrabold tracking-[0.02em] chiffres" style={texteOr}>
            N° {c.numero}
          </span>
          <span className="text-[11.5px] chiffres text-texte-nav">Établi le {etabli}</span>
        </div>
      </header>
      <div className="h-[3px]" style={{ background: or }} />

      <main className="flex flex-1 flex-col gap-[18px] px-12 pt-[26px]">
        <div className="grid grid-cols-2 gap-4">
          <section className="pdf-boite" aria-label="Locataire">
            <span className="pdf-h">Locataire</span>
            <div className="grid grid-cols-2 gap-2.5">
              <Valeur k="Nom" v={c.clientNom} />
              <Valeur k="Téléphone en jeu" v={c.clientTelephone} />
            </div>
          </section>
          <section className="pdf-boite" aria-label="Véhicule">
            <span className="pdf-h">Véhicule</span>
            <div className="grid grid-cols-3 gap-2.5">
              <Valeur k="Modèle" v={c.vehiculeNom} />
              <Valeur k="Catégorie" v={v.categorie.nom} />
              <Valeur k="Immat." v={c.exemplaire.immatriculation} />
            </div>
          </section>
        </div>

        <section className="pdf-boite" aria-label="Période de location">
          <span className="pdf-h">Période de location</span>
          <div className="grid grid-cols-[1fr_1fr_0.7fr] gap-2.5">
            <Valeur k="Début" v={formaterDateComplete(c.debut, p.fuseauServeur)} />
            <Valeur k="Fin prévue" v={formaterDateComplete(c.finPrevue, p.fuseauServeur)} />
            <Valeur k="Durée" v={`${c.heuresFacturees} heure${c.heuresFacturees > 1 ? "s" : ""}`} />
          </div>
        </section>

        <section aria-label="Tarification" className="flex flex-col gap-2">
          <span className="pdf-h">Tarification</span>
          <table className="pdf-tableau">
            <thead>
              <tr>
                <th scope="col">Poste</th>
                <th scope="col">Détail</th>
                <th scope="col" className="pdf-d">
                  Montant
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                { poste: "Tarif horaire", ...lignes.horaire },
                { poste: "Tarif journalier", ...lignes.journalier },
              ].map((l) => (
                <tr key={l.poste}>
                  <td>{l.poste}</td>
                  <td className="pdf-attenue">
                    {l.detail} — {l.applique ? "appliqué, plus avantageux" : "non appliqué"}
                  </td>
                  <td className={`pdf-d ${l.applique ? "" : "pdf-attenue line-through"}`}>
                    {formaterDollars(l.montant)}
                  </td>
                </tr>
              ))}
              <tr>
                <td className="font-extrabold">Location</td>
                <td />
                <td className="pdf-d font-extrabold">{formaterDollars(c.montantLocation)}</td>
              </tr>
              <tr>
                <td className="font-extrabold">Caution</td>
                <td className="pdf-attenue">Restituée au retour si le véhicule est intact</td>
                <td className="pdf-d font-extrabold">{formaterDollars(c.caution)}</td>
              </tr>
            </tbody>
          </table>
          <div className="flex items-center justify-between rounded-[10px] bg-noir px-4 py-3 text-texte">
            <span className="text-[11px] font-extrabold tracking-[0.2em] text-texte-doux">
              TOTAL ENCAISSÉ À LA SIGNATURE
            </span>
            <span className="text-2xl font-extrabold chiffres" style={texteOr}>
              {formaterDollars(c.montantLocation + c.caution)}
            </span>
          </div>
        </section>

        <section aria-label="Conditions" className="flex flex-col gap-2">
          <span className="pdf-h">Conditions</span>
          <ol
            className="m-0 grid list-decimal grid-cols-2 gap-x-[26px] gap-y-1.5 pl-[18px] text-xs leading-[1.5]"
            style={{ color: "var(--bp-encre-douce)" }}
          >
            {conditions.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </section>

        <section aria-label="Signatures" className="mt-1 grid grid-cols-2 gap-4">
          <div className="pdf-boite min-h-[150px] justify-between">
            <div className="flex flex-col gap-[3px]">
              <span className="pdf-h pdf-attenue">Le locataire</span>
              <span className="pdf-v">{c.clientNom}</span>
              <span className="pdf-attenue text-[11.5px]">
                Mention « Lu et approuvé », date et signature
              </span>
            </div>
            <div className="h-px" style={{ background: "var(--bp-encre)" }} />
          </div>
          <div className="pdf-boite relative min-h-[150px] justify-between overflow-hidden">
            <Image
              src="/images/bp-logo.png"
              alt=""
              width={120}
              height={120}
              unoptimized
              className="absolute -right-3.5 -bottom-[18px] opacity-[.14]"
            />
            <div className="flex flex-col gap-[3px]">
              <span className="pdf-h">Pour Black Pégasus</span>
              <span className="pdf-v">{signataire}</span>
              <span className="pdf-attenue text-[11.5px]">Gérant · cachet de la maison</span>
            </div>
            <div className="h-px" style={{ background: "var(--bp-encre)" }} />
          </div>
        </section>
      </main>

      <footer
        className="pdf-attenue mx-12 flex justify-between gap-3 pt-3.5 pb-[26px] text-[11px]"
        style={{ borderTop: "1px solid var(--bp-filet-papier)" }}
      >
        <span>{p.nomEntreprise} · Contrat établi en deux exemplaires</span>
        <span className="chiffres">{c.numero} · page 1 / 1</span>
      </footer>
    </div>
  );
}

export default function PagePdfContrat({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={null}>
      <Contrat params={params} />
    </Suspense>
  );
}
