import { z } from "zod";

/** Coordonnées en jeu uniquement ; aucun courriel ni autre donnée personnelle. */
export const schemaDemandeFormation = z.object({
  nomRp: z
    .string()
    .trim()
    .min(2, "Nom RP : 2 caractères minimum.")
    .max(60, "Nom RP : 60 caractères maximum."),
  telephone: z
    .string()
    .trim()
    .regex(/^[0-9][0-9 .-]{2,14}$/, "Téléphone en jeu invalide (3 à 15 caractères)."),
  permisId: z.string().trim().max(100).nullable(),
  message: z
    .string()
    .trim()
    .min(10, "Message : 10 caractères minimum.")
    .max(1000, "Message : 1000 caractères maximum."),
});

export type DemandeFormation = z.infer<typeof schemaDemandeFormation>;

type PermisClasse = {
  nom: string;
  ordre: number;
  domaine: { id: string; nom: string; ordre: number };
};

/** Trie sans modifier les données reçues et conserve les modalités de chaque permis. */
export function regrouperPermis<T extends PermisClasse>(permis: readonly T[]) {
  const groupes = new Map<string, { domaine: T["domaine"]; permis: T[] }>();
  for (const p of [...permis].sort(
    (a, b) => a.ordre - b.ordre || a.nom.localeCompare(b.nom, "fr"),
  )) {
    let groupe = groupes.get(p.domaine.id);
    if (!groupe) {
      groupe = { domaine: p.domaine, permis: [] };
      groupes.set(p.domaine.id, groupe);
    }
    groupe.permis.push(p);
  }
  return [...groupes.values()].sort(
    (a, b) => a.domaine.ordre - b.domaine.ordre || a.domaine.nom.localeCompare(b.domaine.nom, "fr"),
  );
}
