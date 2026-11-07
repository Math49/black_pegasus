import Image from "next/image";
import Link from "next/link";
import { deconnexion } from "@/app/admin/actions-session";
import { formaterJourCourt } from "@/domaine/dates";
import { pageAccueilPanel, peut } from "@/domaine/permissions";
import { exigerSession } from "@/lib/garde";
import { lireDonneesPanel } from "@/services/panel";
import { GlassCard } from "../ui/GlassCard";
import { Icon } from "../ui/Icon";
import { NavPanel, type LienPanel } from "./NavPanel";

function Cadre({ accueil, children }: { accueil: string; children: React.ReactNode }) {
  return (
    <GlassCard
      as="aside"
      variante="admin"
      aria-label="Navigation du panel"
      className="flex flex-[1_1_236px] flex-col gap-7 rounded-[24px] px-3 pt-[22px] pb-4 lg:sticky lg:top-5 lg:h-[calc(100dvh-40px)] lg:max-w-[256px] lg:overflow-y-auto"
    >
      <Link href={accueil} className="flex items-center gap-3 px-2 text-texte">
        <Image src="/images/bp-logo.png" alt="" width={42} height={42} className="object-contain" />
        <span className="flex flex-col gap-[3px]">
          <span className="texte-or mot-symbole text-[13px]">BLACK PÉGASUS</span>
          <span className="libelle text-[9.5px] tracking-[0.2em]">Administration</span>
          <span className="sr-only">– Accueil du panel</span>
        </span>
      </Link>
      {children}
    </GlassCard>
  );
}

export async function BarreLaterale() {
  const [compte, d] = await Promise.all([exigerSession(), lireDonneesPanel()]);
  const r = compte.role;
  const liens: LienPanel[] = [
    ...(peut(r, "tableauDeBord.consulter")
      ? [{ href: "/admin", libelle: "Tableau de bord", icone: "tableauDeBord" as const }]
      : []),
    ...(peut(r, "solde.consulter")
      ? [{ href: "/admin/solde", libelle: "Solde", icone: "solde" as const }]
      : []),
    ...(peut(r, "vehicule.consulter")
      ? [
          {
            href: "/admin/vehicules",
            libelle: "Véhicules",
            icone: "avion" as const,
            compteur: d.vehicules,
          },
        ]
      : []),
    {
      href: "/admin/contrats",
      libelle: "Contrats",
      icone: "contrat",
      ...(d.retards > 0 && {
        compteur: `${d.retards} retard${d.retards > 1 ? "s" : ""}`,
        compteurAlerte: true,
      }),
    },
    { href: "/admin/comptabilite", libelle: "Comptabilité", icone: "balance" },
    ...(peut(r, "formation.gerer")
      ? [
          {
            href: "/admin/formation/permis",
            libelle: "Permis",
            icone: "contrat" as const,
            groupe: "Formation",
          },
          {
            href: "/admin/formation/demandes",
            libelle: "Demandes",
            icone: "personnes" as const,
            groupe: "Formation",
            compteur: d.demandesNouvelles,
          },
        ]
      : []),
    ...(peut(compte.role, "compte.gerer")
      ? [
          {
            href: "/admin/comptes",
            libelle: "Comptes",
            icone: "personnes" as const,
            groupe: "Administration",
          },
        ]
      : []),
    ...(peut(compte.role, "parametres.gerer")
      ? [
          {
            href: "/admin/parametres",
            libelle: "Paramètres",
            icone: "reglages" as const,
            groupe: "Administration",
          },
        ]
      : []),
  ];
  const ouverte = d.semaine.statut === "OUVERTE";

  return (
    <Cadre accueil={pageAccueilPanel(r)}>
      <NavPanel liens={liens} />
      <div className="mt-auto flex flex-col gap-2.5">
        <Link
          href="/admin/comptabilite"
          className="flex items-center gap-3 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-4)] p-3.5 text-texte hover:border-[var(--bp-trait-18)]"
        >
          <Icon nom={ouverte ? "cadenasOuvert" : "cadenas"} taille={18} className="text-argent-1" />
          <span className="flex flex-col gap-0.5">
            <span className="text-[13px] font-bold">
              Semaine {d.semaine.numero} · {ouverte ? "ouverte" : "clôturée"}
            </span>
            <span className="text-xs text-texte-attenue">
              {ouverte
                ? `Clôture ${formaterJourCourt(d.semaine.ouvertureCloture, d.fuseau)}`
                : "Registre verrouillé"}
            </span>
          </span>
        </Link>
        <Link href="/" className="bp-nv">
          <Icon nom="siteExterne" taille={18} />
          Voir le site public
        </Link>
        <form action={deconnexion}>
          <button
            type="submit"
            className="bp-nv w-full cursor-pointer border-0 bg-transparent text-left font-[inherit]"
          >
            <Icon nom="deconnexion" taille={18} />
            Déconnexion
          </button>
        </form>
      </div>
    </Cadre>
  );
}

/** Squelette pendant le chargement de la session. */
export function BarreLateraleSquelette() {
  return (
    <Cadre accueil="/admin">
      <span />
    </Cadre>
  );
}
