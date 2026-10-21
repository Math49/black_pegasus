import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import type { Tx } from "@/lib/transaction";

// Journal d'activité (CONCEPTION § 9.2) : chaque écriture du panel y laisse une ligne,
// dans la même transaction que l'écriture elle-même.

export async function journaliser(
  tx: Tx,
  entree: { compteId: string; action: string; cible: string; details?: Prisma.InputJsonValue },
) {
  await tx.journalAudit.create({ data: entree });
}

/** Libellés lisibles des actions du journal. */
export const LIBELLES_ACTIONS: Record<string, string> = {
  "compte.ajouter": "Compte ajouté",
  "compte.role": "Rôle modifié",
  "compte.activer": "Compte réactivé",
  "compte.desactiver": "Compte désactivé",
  "vehicule.creer": "Véhicule créé",
  "vehicule.modifier": "Véhicule modifié",
  "vehicule.afficher": "Véhicule affiché sur le site",
  "vehicule.masquer": "Véhicule masqué du site",
  "vehicule.supprimer": "Véhicule supprimé",
  "contrat.creer": "Contrat créé",
  "contrat.cloturer": "Contrat clôturé",
  "contrat.annuler": "Contrat annulé",
  "mouvement.creer": "Mouvement saisi",
  "mouvement.modifier": "Mouvement corrigé",
  "mouvement.contrePasser": "Mouvement contre-passé",
  "semaine.cloturer": "Semaine clôturée",
  "parametres.agence": "Agence modifiée",
  "parametres.textes": "Textes du site modifiés",
  "parametres.reglement": "Règlement modifié",
  "parametres.regles": "Règles de location modifiées",
  "parametres.categorie.ajouter": "Catégorie ajoutée",
  "parametres.categorie.renommer": "Catégorie renommée",
  "parametres.categorie.ordre": "Ordre des catégories modifié",
  "parametres.categorie.supprimer": "Catégorie supprimée",
};
