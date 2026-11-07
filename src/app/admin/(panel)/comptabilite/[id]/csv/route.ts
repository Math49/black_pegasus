import { libelleFiliale } from "@/domaine/filiales";
import { format } from "date-fns";
import { registreCsv } from "@/domaine/comptabilite";
import { versHeureServeur } from "@/domaine/dates";
import { libelleSemaine, numeroOperationAffiche } from "@/domaine/numerotation";
import { peut } from "@/domaine/permissions";
import { LIBELLES_CATEGORIE } from "@/domaine/solde";
import { lireCompteConnecte } from "@/lib/garde";
import { maintenant } from "@/lib/horloge";
import { prisma } from "@/lib/prisma";
import { lireEtatSemaine } from "@/services/comptabilite";

// Export CSV du registre d'une semaine (ouverte ou clôturée).
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const compte = await lireCompteConnecte();
  if (!compte || !peut(compte.role, "comptabilite.exporterCsv"))
    return new Response("Accès refusé", { status: 401 });
  const { id } = await params;
  const { fuseauServeur: fuseau } = await prisma.parametres.findUniqueOrThrow({ where: { id: 1 } });
  let etat;
  try {
    etat = await lireEtatSemaine(id, await maintenant(), fuseau);
  } catch {
    return new Response("Semaine introuvable", { status: 404 });
  }
  const csv = registreCsv(
    etat.mouvements.map((m) => ({
      numero: numeroOperationAffiche(m.numero),
      date: format(versHeureServeur(m.date, fuseau), "yyyy-MM-dd HH:mm"),
      categorie: LIBELLES_CATEGORIE[m.categorie],
      filiale: libelleFiliale(m.filiale),
      libelle: m.motif,
      piece: m.justificatifNumero ?? m.contrat?.numero ?? m.venteCarte?.numero ?? "",
      sens: m.sens,
      categorieCode: m.categorie,
      montant: m.montant,
      mention: m.annulePar
        ? `Annulé par ${numeroOperationAffiche(m.annulePar.numero)}`
        : m.annuleMouvement
          ? `Contre-passation de ${numeroOperationAffiche(m.annuleMouvement.numero)}`
          : "",
    })),
  );
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="registre-${etat.semaine.annee}-${libelleSemaine(etat.semaine.numero)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
