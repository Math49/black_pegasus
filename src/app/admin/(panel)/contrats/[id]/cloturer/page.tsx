import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { EnTetePanel } from "@/composants/admin/EnTetePanel";
import { FormulaireCloture } from "@/composants/admin/contrats/FormulaireCloture";
import { GlassCard } from "@/composants/ui/GlassCard";
import { Icon } from "@/composants/ui/Icon";
import { Statut } from "@/composants/ui/Statut";
import { formaterDollars } from "@/domaine/argent";
import { formaterJourHeure } from "@/domaine/contrats";
import { formaterHeureServeurIso } from "@/domaine/dates";
import { peut } from "@/domaine/permissions";
import { estEnRetard } from "@/domaine/retard";
import { libelleType } from "@/domaine/unites";
import { exigerPermission } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { lireContrat } from "@/services/contrats";
import { lireDonneesPanel } from "@/services/panel";
import { urlPhoto } from "@/services/stockage";

export const metadata: Metadata = { title: "Clôturer le contrat" };

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="libelle text-[10.5px] tracking-[0.2em]">{k}</span>
      <span className="text-[15px] font-semibold chiffres">{v}</span>
    </div>
  );
}

async function Contenu({
  params,
}: {
  params: PageProps<"/admin/contrats/[id]/cloturer">["params"];
}) {
  const compte = await exigerPermission("contrat.cloturer");
  const { id } = await params;
  const [c, d, p] = await Promise.all([
    lireContrat(id),
    lireDonneesPanel(),
    prisma.parametres.findUniqueOrThrow({ where: { id: 1 } }),
  ]);
  if (!c) notFound();
  if (c.statut !== "EN_COURS") redirect("/admin/contrats?onglet=termines");
  const v = c.exemplaire.vehicule;
  const enRetard = estEnRetard(c.finPrevue, d.maintenant);

  return (
    <>
      <EnTetePanel
        titre={
          <span className="flex flex-wrap items-center gap-3">
            Clôturer le contrat
            {enRetard && <Statut ton="alerte">En retard</Statut>}
          </span>
        }
        fil={[{ libelle: "Contrats", href: "/admin/contrats" }, { libelle: c.numero }]}
        retour={{ href: "/admin/contrats", libelle: "Retour aux contrats" }}
      />

      <FormulaireCloture
        contrat={{
          id: c.id,
          numero: c.numero,
          vehiculeNom: c.vehiculeNom,
          prixHeure: c.prixHeure,
          caution: c.caution,
          finPrevue: c.finPrevue.toISOString(),
        }}
        forfaits={p.forfaitsDegats as { libelle: string; montant: number }[]}
        regles={{
          toleranceRetardMin: p.toleranceRetardMin,
          majorationRetard: p.majorationRetard,
          seuilDefautRestitutionMin: p.seuilDefautRestitutionMin,
          penalitesSurCaution: p.penalitesSurCaution,
        }}
        fuseau={d.fuseau}
        retourParDefaut={formaterHeureServeurIso(d.maintenant, d.fuseau)}
        peutAnnuler={peut(compte.role, "contrat.annuler")}
      >
        <GlassCard
          as="section"
          variante="admin"
          aria-labelledby="titre-contrat"
          className="flex flex-col gap-[18px] rounded-[24px] px-7 py-[26px]"
        >
          <div className="flex items-center justify-between">
            <h2 id="titre-contrat" className="m-0 titre text-lg font-semibold">
              Contrat
            </h2>
            <Link
              href={`/admin/contrats/${c.id}/pdf`}
              prefetch={false}
              target="_blank"
              className="flex min-h-11 items-center gap-2 text-sm font-semibold text-texte-doux hover:text-texte"
            >
              <Icon nom="document" taille={18} />
              Voir le PDF signé
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Image
              src={urlPhoto(v.photo)}
              alt=""
              width={104}
              height={64}
              className="h-16 w-[104px] rounded-[10px] object-cover"
            />
            <span className="flex flex-col gap-1">
              <span className="titre text-lg font-semibold">
                {c.vehiculeNom} · {c.exemplaire.immatriculation}
              </span>
              <span className="text-[13px] text-texte-attenue">
                {libelleType(v.type)} · {v.categorie.nom} · {formaterDollars(c.prixHeure)} / h
              </span>
            </span>
          </div>
          <div className="grid grid-cols-4 gap-x-6 gap-y-4 rounded-[14px] border border-[var(--bp-trait-8)] bg-[var(--bp-voile-3)] px-[18px] py-4 max-md:grid-cols-2">
            <Info k="Client" v={c.clientNom} />
            <Info k="Téléphone" v={c.clientTelephone} />
            <Info k="Début" v={formaterJourHeure(c.debut, d.fuseau)} />
            <Info k="Fin prévue" v={formaterJourHeure(c.finPrevue, d.fuseau)} />
            <Info k="Location réglée" v={formaterDollars(c.montantLocation)} />
            <Info k="Caution détenue" v={formaterDollars(c.caution)} />
          </div>
        </GlassCard>
      </FormulaireCloture>
    </>
  );
}

export default function PageCloture({ params }: PageProps<"/admin/contrats/[id]/cloturer">) {
  return (
    <Suspense fallback={null}>
      <Contenu params={params} />
    </Suspense>
  );
}
