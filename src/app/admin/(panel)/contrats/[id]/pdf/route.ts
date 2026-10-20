import { peut } from "@/domaine/permissions";
import { lireCompteConnecte } from "@/lib/garde";
import { pdfContrat } from "@/services/pdf";

// Téléchargement du PDF d'un contrat (généré à la demande s'il manque).
export async function GET(_requete: Request, { params }: { params: Promise<{ id: string }> }) {
  const compte = await lireCompteConnecte();
  if (!compte || !peut(compte.role, "contrat.pdf"))
    return new Response("Accès refusé", { status: 401 });
  const { id } = await params;
  const pdf = await pdfContrat(id);
  if (!pdf) return new Response("Contrat introuvable", { status: 404 });
  return new Response(new Uint8Array(pdf.contenu), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.numero}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
