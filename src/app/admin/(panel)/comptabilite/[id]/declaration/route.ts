import { numeroDeclaration } from "@/domaine/numerotation";
import { peut } from "@/domaine/permissions";
import { lireIdSemaine } from "@/domaine/semaine";
import { lireCompteConnecte } from "@/lib/garde";
import { prisma } from "@/lib/prisma";
import { pdfBrouillonDeclaration, pdfDeclaration } from "@/services/pdf";

// Déclaration FISC d'une semaine : archive d'une semaine clôturée (administrateur), ou
// brouillon filigrané d'une semaine ouverte (tous les comptes). CONCEPTION § 6.6.
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const compte = await lireCompteConnecte();
  if (!compte) return new Response("Accès refusé", { status: 401 });
  const { id } = await params;
  let ref: string;
  try {
    const { annee, numero } = lireIdSemaine(id);
    ref = numeroDeclaration(annee, numero);
  } catch {
    return new Response("Semaine introuvable", { status: 404 });
  }
  const semaine = await prisma.semaine.findUnique({ where: { id }, select: { statut: true } });

  if (semaine?.statut === "CLOTUREE") {
    if (!peut(compte.role, "declaration.exporter"))
      return new Response("Réservé aux administrateurs", { status: 403 });
    const pdf = await pdfDeclaration(id);
    if (!pdf) return new Response("Déclaration introuvable", { status: 404 });
    return new Response(new Uint8Array(pdf.contenu), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${ref}.pdf"`,
        "Cache-Control": "private, no-store",
        ...(pdf.sha256 && { "X-Empreinte-SHA256": pdf.sha256 }),
      },
    });
  }

  if (!peut(compte.role, "declaration.brouillon"))
    return new Response("Accès refusé", { status: 403 });
  const brouillon = await pdfBrouillonDeclaration(id);
  return new Response(new Uint8Array(brouillon), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${ref}-brouillon.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
