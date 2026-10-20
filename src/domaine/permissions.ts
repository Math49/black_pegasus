import { ErreurMetier, type Role } from "./types";

// HANDOFF § 7.9, complété par la CONCEPTION (§ 6.5, 6.6, 7, 9.1, 9.2).

const TOUS: readonly Role[] = ["ADMIN", "GESTIONNAIRE"];
const ADMIN: readonly Role[] = ["ADMIN"];

const MATRICE = {
  "contrat.creer": TOUS,
  "contrat.cloturer": TOUS,
  "contrat.pdf": TOUS,
  "contrat.annuler": ADMIN,
  "vehicule.creer": TOUS,
  "vehicule.modifier": TOUS,
  "vehicule.supprimer": ADMIN,
  "mouvement.creer": TOUS,
  "mouvement.modifier": TOUS,
  "mouvement.contrePasser": ADMIN,
  "comptabilite.consulter": TOUS,
  "comptabilite.exporterCsv": TOUS,
  "declaration.brouillon": TOUS,
  "declaration.exporter": ADMIN,
  "semaine.cloturer": ADMIN,
  "compte.gerer": ADMIN,
  "journal.consulter": ADMIN,
  "parametres.gerer": ADMIN,
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof MATRICE;
export const ACTIONS = Object.keys(MATRICE) as Action[];

export const peut = (role: Role, action: Action): boolean =>
  (MATRICE[action] as readonly Role[]).includes(role);

// ── Protection des comptes (CONCEPTION § 7) ────────────────────────────────

type CompteCible = { id: string; role: Role; actif: boolean };

/**
 * Vérifie qu'une modification de compte est permise. Lève une ErreurMetier sinon.
 * `adminsActifs` : nombre d'administrateurs actifs avant la modification.
 */
export function verifierModificationCompte(p: {
  acteur: { id: string; role: Role };
  cible: CompteCible;
  modification: { role?: Role; actif?: boolean };
  adminsActifs: number;
}): void {
  const { acteur, cible, modification } = p;
  if (!peut(acteur.role, "compte.gerer")) {
    throw new ErreurMetier("Seul un administrateur peut gérer les comptes.");
  }
  const soiMeme = acteur.id === cible.id;
  if (soiMeme && modification.actif === false) {
    throw new ErreurMetier("Vous ne pouvez pas désactiver votre propre compte.");
  }
  if (soiMeme && modification.role === "GESTIONNAIRE" && cible.role === "ADMIN") {
    throw new ErreurMetier("Vous ne pouvez pas retirer votre propre rôle d'administrateur.");
  }
  const retireUnAdminActif =
    cible.role === "ADMIN" &&
    cible.actif &&
    (modification.actif === false || modification.role === "GESTIONNAIRE");
  if (retireUnAdminActif && p.adminsActifs <= 1) {
    throw new ErreurMetier("Il doit rester au moins un administrateur actif.");
  }
}
