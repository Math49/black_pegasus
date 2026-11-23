import { format } from "date-fns";
import { fr } from "date-fns/locale";
import Image from "next/image";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Fragment, Suspense } from "react";
import { formaterDollars, formaterMontant } from "@/domaine/argent";
import {
  colonneRegistre,
  contratsLoues,
  pieceAbregee,
  syntheseParFiliale,
  totauxRegistre,
  ventilation,
} from "@/domaine/comptabilite";
import { libelleFiliale } from "@/domaine/filiales";
import { nomCompte } from "@/domaine/comptes";
import { versHeureServeur } from "@/domaine/dates";
import { numeroDeclaration, numeroOperationAffiche } from "@/domaine/numerotation";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { lireEtatSemaine } from "@/services/comptabilite";
import { EN_TETE_JETON, jetonPdf } from "@/services/pdf";

// Gabarit de la déclaration d'impôt hebdomadaire (maquettes 31–32), imprimé en A4 par
// services/pdf.ts. « ?brouillon=1 » : semaine ouverte, filigrane BROUILLON.

// Page 1 : la ventilation par filiale et les sous-totaux de filiale prennent la place de neuf contrats.
const CONTRATS_PAGE_1 = 5;
const LIGNES_PAR_PAGE = 40;
/** Lignes laissant la place à l'attestation sur la dernière page du registre. */
const LIGNES_AVEC_ATTESTATION = 36;

const ETATS = { EN_COURS: "En cours", TERMINE: "Terminé", ANNULE: "Annulé" } as const;

function morceaux<T>(liste: readonly T[], taille: number): T[][] {
  const r: T[][] = [];
  for (let i = 0; i < liste.length; i += taille) r.push(liste.slice(i, i + taille));
  return r.length ? r : [[]];
}

function Logo({ taille }: { taille: number }) {
  return (
    <Image
      src="/images/bp-logo.png"
      alt=""
      width={taille}
      height={taille}
      className="object-contain"
    />
  );
}

async function Declaration({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if ((await headers()).get(EN_TETE_JETON) !== jetonPdf()) notFound();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const brouillon = sp.brouillon === "1";
  const [p, filiales] = await Promise.all([
    prisma.parametres.findUniqueOrThrow({ where: { id: 1 } }),
    prisma.filiale.findMany({ orderBy: { ordre: "asc" } }),
  ]);
  const fuseau = p.fuseauServeur;
  let etat;
  try {
    etat = await lireEtatSemaine(id, await maintenant(), fuseau);
  } catch {
    notFound();
  }
  if (!brouillon && etat.statut !== "CLOTUREE") notFound();

  const { semaine: s, synthese: syn, mouvements } = etat;
  const quand = (d: Date, motif: string) =>
    format(versHeureServeur(d, fuseau), motif, { locale: fr });
  const etablie = brouillon ? await maintenant() : etat.enBase!.clotureeLe!;
  const dimanche = new Date(s.fin.getTime() - 1);

  // Gérant : signataire de la clôture, sinon (brouillon) le dernier administrateur à avoir clôturé.
  const gerant =
    etat.enBase?.clotureePar ??
    (
      await prisma.semaine.findFirst({
        where: { clotureeParId: { not: null } },
        orderBy: { debut: "desc" },
        include: { clotureePar: true },
      })
    )?.clotureePar ??
    (await prisma.compte.findFirst({ where: { role: "ADMIN", actif: true } }));
  const nomGerant = gerant ? nomCompte(gerant) : "—";

  const idsContrats = [
    ...new Set(
      mouvements.filter((m) => m.categorie === "LOCATION" && m.contratId).map((m) => m.contratId!),
    ),
  ];
  const contrats = await prisma.contrat.findMany({
    where: { id: { in: idsContrats } },
    orderBy: { numero: "asc" },
  });
  const { regle } = etat;
  const v = ventilation(mouvements, regle);
  const nomCat = (id: string) =>
    mouvements.find((m) => m.categorie === id)?.categorieMouvement.nom ?? id;
  const locations =
    v.find((l) => l.categorie === "LOCATION" && l.nature === "RECETTE")?.montant ?? 0;
  const nbContrats = contratsLoues(mouvements);
  const parFiliale = syntheseParFiliale(mouvements, regle);
  const totaux = totauxRegistre(mouvements, regle);
  const avecApports = regle === 1 && mouvements.some((m) => m.categorie === "APPORT");
  const avecImpot = syn.impotDu !== null;

  const ref = numeroDeclaration(s.annee, s.numero);
  const periode = (c: (typeof contrats)[number]) => {
    const fin = c.retourReel ?? c.finPrevue;
    const memeJour = quand(c.debut, "dd/MM") === quand(fin, "dd/MM");
    return `${quand(c.debut, "dd/MM HH:mm")} → ${quand(fin, memeJour ? "HH:mm" : "dd/MM HH:mm")}`;
  };

  // Pagination : contrats au-delà de la page 1, registre par blocs, attestation en fin.
  const contrats1 = contrats.slice(0, CONTRATS_PAGE_1);
  const contratsSuite =
    contrats.length > CONTRATS_PAGE_1
      ? morceaux(contrats.slice(CONTRATS_PAGE_1), LIGNES_PAR_PAGE)
      : [];
  const blocs = morceaux(mouvements, LIGNES_PAR_PAGE);
  const attestationSeparee = blocs[blocs.length - 1].length > LIGNES_AVEC_ATTESTATION;
  const total = 1 + contratsSuite.length + blocs.length + (attestationSeparee ? 1 : 0);
  const pied = (page: number) => (
    <footer className="pdf-pied mt-auto">
      <span>
        {p.nomEntreprise} · Déclaration {ref}
        {brouillon && " · brouillon non transmissible"}
      </span>
      <span>
        Page {page} / {total}
      </span>
    </footer>
  );
  const filigrane = () =>
    brouillon ? (
      <div aria-hidden="true" className="pdf-filigrane">
        BROUILLON
      </div>
    ) : null;
  const enTeteSuite = () => (
    <header
      className="flex items-center justify-between gap-4 pb-2.5"
      style={{ borderBottom: "3px double var(--bp-encre)" }}
    >
      <span className="flex items-center gap-2.5">
        <Logo taille={34} />
        <span className="pdf-titre text-[12.5px] tracking-[0.12em] whitespace-nowrap uppercase">
          {p.nomEntreprise}
        </span>
      </span>
      <span
        className="text-xs whitespace-nowrap tabular-nums"
        style={{ color: "var(--bp-encre-grise)" }}
      >
        {ref} · semaine du {quand(s.debut, "d")} au {quand(dimanche, "dd/MM/yyyy")}
      </span>
    </header>
  );
  const ligneContrat = (c: (typeof contrats)[number]) => (
    <div className="pdf-cg">
      <span className="font-bold">{c.numero}</span>
      <span>{c.clientNom}</span>
      <span>{c.vehiculeNom}</span>
      <span>{periode(c)}</span>
      <span className="pdf-d font-bold">{formaterDollars(c.montantLocation)}</span>
      <span>{ETATS[c.statut]}</span>
    </div>
  );
  const enTeteContrats = () => (
    <div className="pdf-cg pdf-entete-tableau">
      <span>N°</span>
      <span>Client</span>
      <span>Véhicule</span>
      <span>Période</span>
      <span className="pdf-d">Location</span>
      <span>État</span>
    </div>
  );
  const attestation = () => (
    <section
      aria-label="Attestation et signature"
      className="mt-auto grid grid-cols-[1.3fr_1fr] items-stretch gap-5"
    >
      <div className="flex flex-col gap-1.5">
        <span className="pdf-rubrique">4. Attestation</span>
        <p className="m-0 text-[12.5px] leading-[1.55]">
          Je soussigné, {nomGerant}, gérant de {p.nomEntreprise}, certifie l’exactitude des
          informations de la présente déclaration et de son registre pour la semaine {s.numero}.
        </p>
        <span className="text-[12.5px] tabular-nums">
          Fait à Los Santos, le {quand(etablie, "EEEE dd/MM/yyyy")}.
        </span>
      </div>
      <div
        className="rounded relative flex min-h-[132px] flex-col justify-between overflow-hidden px-3.5 py-2.5"
        style={{ border: "1.5px solid var(--bp-encre)" }}
      >
        <span className="absolute -right-2.5 -bottom-3.5 opacity-[0.12]">
          <Logo taille={104} />
        </span>
        <span className="flex flex-col gap-0.5">
          <span
            className="text-[10.5px] font-extrabold tracking-[0.14em] uppercase"
            style={{ color: "var(--bp-encre-grise)" }}
          >
            Signature du gérant
          </span>
          <span className="text-[13px] font-bold">{nomGerant}</span>
        </span>
        <span className="h-px" style={{ background: "var(--bp-encre)" }} />
      </div>
    </section>
  );

  const ligneSynthese = (
    libelle: React.ReactNode,
    montant: number,
    options: { gras?: boolean; sous?: boolean; dernier?: boolean } = {},
  ) => (
    <div
      className={`pdf-ligne ${options.sous ? "pdf-ligne--sous" : ""}`}
      style={options.dernier ? { borderBottom: 0 } : undefined}
    >
      <span className={options.gras ? "font-extrabold" : undefined}>{libelle}</span>
      <span className={options.gras ? "font-extrabold" : options.sous ? undefined : "font-bold"}>
        {formaterDollars(montant)}
      </span>
    </div>
  );

  return (
    <>
      {/* ── Page 1 : identification, synthèse, contrats ── */}
      <div className="pdf-feuille pdf-feuille--fisc">
        {filigrane()}
        <header
          className="flex items-start justify-between gap-5 pb-4"
          style={{ borderBottom: "3px double var(--bp-encre)" }}
        >
          <div className="flex items-center gap-3.5">
            <Logo taille={64} />
            <div className="flex flex-col gap-[3px]">
              <span className="pdf-titre text-[15px] tracking-[0.12em]">BLACK PÉGASUS</span>
              <span
                className="text-[10px] font-bold tracking-[0.3em]"
                style={{ color: "var(--bp-encre-grise)" }}
              >
                AMERICAN TRANSPORTS
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 text-right">
            <span
              className="text-[10.5px] font-extrabold tracking-[0.2em]"
              style={{ color: "var(--bp-encre-grise)" }}
            >
              {brouillon ? "BROUILLON · NON TRANSMIS AU FISC" : "À L’ATTENTION DU FISC"}
            </span>
            <h1 className="pdf-titre m-0 text-[21px]">Déclaration d’impôt hebdomadaire</h1>
            <span className="text-xs tabular-nums" style={{ color: "var(--bp-encre-grise)" }}>
              Réf. {ref} · {brouillon ? "brouillon du" : "établie le"}{" "}
              {quand(etablie, "EEEE dd/MM/yyyy 'à' HH:mm")}
            </span>
          </div>
        </header>

        <section aria-label="Identification" className="grid grid-cols-2 gap-x-7 gap-y-2">
          {[
            ["Entreprise", p.nomEntreprise],
            [
              "Période déclarée",
              `Semaine ${s.numero} · ${quand(s.debut, "EEEE dd/MM")} au ${quand(dimanche, "EEEE dd/MM/yyyy")}`,
            ],
            ["Activité", "Location, formation, cartes à collectionner"],
            ["Gérant", nomGerant],
            ["N° d’immatriculation", p.numeroImmatriculationEntreprise],
            ["Filiales", filiales.map((f) => f.nom.replace(/^Black Pégasus /, "")).join(" · ")],
          ].map(([k, val]) => (
            <div key={k} className="flex flex-col gap-0.5">
              <span className="pdf-cle">{k}</span>
              <span className="pdf-valeur tabular-nums">{val}</span>
            </div>
          ))}
        </section>

        <section aria-label="Synthèse financière" className="flex flex-col gap-1">
          <span className="pdf-rubrique">1. Synthèse financière</span>
          {ligneSynthese(
            `Solde d’ouverture (${quand(s.debut, "EEEE dd/MM, HH:mm")})`,
            syn.soldeOuverture,
          )}
          {ligneSynthese("Total des recettes", syn.recettes, { gras: true })}
          {v
            .filter((l) => l.nature === "RECETTE" && l.montant !== 0)
            .map((l) => (
              <Fragment key={`r-${l.categorie}`}>
                {ligneSynthese(
                  l.categorie === "LOCATION"
                    ? `${nomCat(l.categorie)} (${nbContrats} contrat${nbContrats > 1 ? "s" : ""})`
                    : nomCat(l.categorie),
                  l.montant,
                  { sous: true },
                )}
              </Fragment>
            ))}
          {ligneSynthese("Total des dépenses", syn.depenses, { gras: true })}
          {v
            .filter((l) => l.nature === "DEPENSE" && l.montant !== 0)
            .map((l) => (
              <Fragment key={`d-${l.categorie}`}>
                {ligneSynthese(
                  l.categorie === "IMPOTS"
                    ? `${nomCat(l.categorie)} (semaine ${s.numero - 1 || "précédente"})`
                    : nomCat(l.categorie),
                  l.montant,
                  { sous: true },
                )}
              </Fragment>
            ))}
          {avecImpot &&
            ligneSynthese("Base imposable (recettes de la semaine)", syn.baseImposable, {
              gras: true,
            })}
          <div
            className="rounded my-1 flex items-baseline justify-between gap-3 px-3 py-2"
            style={{ border: "1.5px solid var(--bp-encre)" }}
          >
            <span className="text-[13px] font-extrabold tracking-[0.08em] uppercase">
              {avecImpot ? `Impôt dû (${syn.tauxImpot} % des recettes)` : "Résultat imposable"}
            </span>
            <span className="text-xl font-extrabold tabular-nums">
              {formaterDollars(avecImpot ? syn.impotDu! : syn.baseImposable)}
            </span>
          </div>
          {ligneSynthese(
            <>
              Cautions détenues au {quand(brouillon ? etablie : dimanche, "dd/MM")}{" "}
              <span style={{ color: "var(--bp-encre-grise)" }}>
                — non imposables · encaissées {formaterDollars(syn.cautionsEncaissees)}, rendues{" "}
                {formaterDollars(syn.cautionsRendues)}
              </span>
            </>,
            syn.cautionsDetenues,
          )}
          {syn.apports !== 0 && ligneSynthese("Apports (hors résultat)", syn.apports)}
          {ligneSynthese(
            brouillon
              ? `Solde provisoire (${quand(etablie, "EEEE dd/MM, HH:mm")})`
              : `Solde de clôture (${quand(etablie, "EEEE dd/MM, HH:mm")})`,
            syn.solde,
            { gras: true, dernier: true },
          )}
        </section>

        <section aria-label="Ventilation par filiale" className="flex flex-col">
          <span className="pdf-rubrique mb-1">Ventilation par filiale</span>
          <div
            className="pdf-ventilation pdf-cle"
            style={{ borderBottom: "1px solid var(--bp-filet-gris)" }}
          >
            <span>Filiale</span>
            <span className="pdf-d">Recettes</span>
            <span className="pdf-d">Dépenses</span>
            <span className="pdf-d">Résultat</span>
          </div>
          {parFiliale.map((l) => (
            <div
              key={l.filiale ?? "groupe"}
              className="pdf-ventilation tabular-nums"
              style={{ borderBottom: "1px solid var(--bp-filet-gris-clair)" }}
            >
              <span>{libelleFiliale(l.filiale)}</span>
              <span className="pdf-d">{formaterDollars(l.recettes)}</span>
              <span className="pdf-d">{formaterDollars(l.depenses)}</span>
              <span className="pdf-d font-bold">{formaterDollars(l.resultat)}</span>
            </div>
          ))}
          <div className="pdf-ventilation font-extrabold tabular-nums">
            <span>Groupe · total</span>
            <span className="pdf-d">{formaterDollars(syn.recettes)}</span>
            <span className="pdf-d">{formaterDollars(syn.depenses)}</span>
            <span className="pdf-d">{formaterDollars(syn.recettes - syn.depenses)}</span>
          </div>
        </section>

        <section aria-label="Contrats de la semaine" className="flex flex-col gap-0.5">
          <span className="pdf-rubrique mb-1">2. Contrats de la semaine</span>
          {enTeteContrats()}
          {contrats1.map((c) => (
            <Fragment key={c.id}>{ligneContrat(c)}</Fragment>
          ))}
          {contratsSuite.length === 0 && (
            <div className="pdf-cg font-extrabold" style={{ borderBottom: 0 }}>
              <span />
              <span>
                {contrats.length} contrat{contrats.length > 1 ? "s" : ""}
              </span>
              <span />
              <span />
              <span className="pdf-d">{formaterDollars(locations)}</span>
              <span />
            </div>
          )}
        </section>
        {pied(1)}
      </div>

      {contratsSuite.map((bloc, i) => (
        <div key={`c${i}`} className="pdf-feuille pdf-feuille--fisc pdf-suite">
          {filigrane()}
          {enTeteSuite()}
          <section className="flex flex-col gap-0.5">
            <span className="pdf-rubrique mb-1">2. Contrats de la semaine (suite)</span>
            {enTeteContrats()}
            {bloc.map((c) => (
              <Fragment key={c.id}>{ligneContrat(c)}</Fragment>
            ))}
          </section>
          {pied(2 + i)}
        </div>
      ))}

      {blocs.map((bloc, i) => {
        const dernier = i === blocs.length - 1;
        return (
          <div key={`r${i}`} className="pdf-feuille pdf-feuille--fisc pdf-suite">
            {filigrane()}
            {enTeteSuite()}
            <section aria-label="Registre des opérations" className="flex flex-col">
              <span className="pdf-rubrique mb-1">
                3. Registre complet des opérations (montants en $){i > 0 && " — suite"}
              </span>
              <div className="pdf-rg pdf-entete-tableau">
                <span>N°</span>
                <span>Date</span>
                <span>Catégorie</span>
                <span>Libellé</span>
                <span>Pièce</span>
                <span className="pdf-d">Recette</span>
                <span className="pdf-d">Dépense</span>
                <span className="pdf-d">Caution</span>
              </div>
              {bloc.map((m) => {
                const c = colonneRegistre(m, regle);
                const cellule = (col: typeof c.colonne) =>
                  c.colonne === col
                    ? formaterMontant(c.montant, { signe: col === "caution" || col === "apport" })
                    : "";
                return (
                  <div key={m.id} className="pdf-rg">
                    <span className="font-bold">{numeroOperationAffiche(m.numero).slice(-3)}</span>
                    <span>{quand(m.date, "dd/MM HH:mm")}</span>
                    <span>{m.categorieMouvement.nom}</span>
                    <span>
                      {m.motif}
                      {c.colonne === "apport" && ` (apport ${cellule("apport")})`}
                    </span>
                    <span style={{ color: "var(--bp-encre-grise-foncee)" }}>
                      {m.justificatifNumero ??
                        (m.contrat
                          ? pieceAbregee(m.contrat.numero)
                          : m.venteCarte
                            ? pieceAbregee(m.venteCarte.numero)
                            : "—")}
                    </span>
                    <span className="pdf-d font-bold">{cellule("recette")}</span>
                    <span className="pdf-d font-bold">{cellule("depense")}</span>
                    <span className="pdf-d" style={{ color: "var(--bp-encre-grise-foncee)" }}>
                      {cellule("caution")}
                    </span>
                  </div>
                );
              })}
              {dernier && (
                <>
                  <div className="pdf-rg pdf-rg--total">
                    <span />
                    <span />
                    <span />
                    <span>Totaux · {mouvements.length} opérations</span>
                    <span />
                    <span className="pdf-d">{formaterMontant(totaux.recette)}</span>
                    <span className="pdf-d">{formaterMontant(totaux.depense)}</span>
                    <span className="pdf-d">
                      {formaterMontant(totaux.caution, { signe: true })}
                    </span>
                  </div>
                  <span className="mt-1.5 text-xs" style={{ color: "var(--bp-encre-grise)" }}>
                    Pièces : CTR = contrat signé · JUST = justificatif joint (capture d’écran en
                    jeu), disponibles sur demande du FISC.
                    {avecApports && " Les apports figurent dans le libellé, hors résultat."}
                  </span>
                </>
              )}
            </section>
            {dernier && !attestationSeparee && attestation()}
            {pied(2 + contratsSuite.length + i)}
          </div>
        );
      })}

      {attestationSeparee && (
        <div className="pdf-feuille pdf-feuille--fisc pdf-suite">
          {filigrane()}
          {enTeteSuite()}
          {attestation()}
          {pied(total)}
        </div>
      )}
    </>
  );
}

export default function PageDeclaration(props: PageProps<"/interne/pdf/declaration/[id]">) {
  return (
    <Suspense fallback={null}>
      <Declaration params={props.params} searchParams={props.searchParams} />
    </Suspense>
  );
}
