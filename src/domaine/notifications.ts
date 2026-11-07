import { minutesDepassement, estEnRetard } from "./retard";

// Notifications de la cloche du panel (CONCEPTION § 9.3), calculées à l'affichage.

export type Notification = {
  cle: string;
  type: "retard" | "semaine" | "justificatif" | "formation";
  message: string;
  href: string;
};

/** « 40 min », « 1 h 10 », « 3 h ». */
export function formaterDuree(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, "0")}`;
}

export function notificationsPanel(p: {
  contratsEnCours: readonly { numero: string; clientNom: string; finPrevue: Date }[];
  /** Semaine précédente encore ouverte (numéro), ou null. */
  semainePrecedenteOuverte: number | null;
  /** Dépenses des semaines ouvertes sans justificatif (numéros affichés). */
  depensesSansJustificatif: readonly string[];
  maintenant: Date;
  fuseau: string;
  demandesFormationNouvelles?: number;
}): Notification[] {
  const notifications: Notification[] = p.contratsEnCours
    .filter((c) => estEnRetard(c.finPrevue, p.maintenant))
    .sort((a, b) => a.finPrevue.getTime() - b.finPrevue.getTime())
    .map((c) => ({
      cle: `retard:${c.numero}`,
      type: "retard",
      message: `${c.numero} · ${c.clientNom} : retard de ${formaterDuree(minutesDepassement(c.finPrevue, p.maintenant, p.fuseau))}`,
      href: "/admin/contrats",
    }));

  if (p.semainePrecedenteOuverte !== null) {
    notifications.push({
      cle: "semaine",
      type: "semaine",
      message: `La semaine ${p.semainePrecedenteOuverte} n’est pas encore clôturée`,
      href: "/admin/comptabilite",
    });
  }

  const n = p.depensesSansJustificatif.length;
  if (n > 0) {
    notifications.push({
      cle: "justificatifs",
      type: "justificatif",
      message:
        n === 1
          ? `${p.depensesSansJustificatif[0]} : dépense sans justificatif`
          : `${n} dépenses sans justificatif (${p.depensesSansJustificatif.join(", ")})`,
      href: "/admin/solde",
    });
  }
  const demandes = p.demandesFormationNouvelles ?? 0;
  if (demandes > 0)
    notifications.push({
      cle: "formation",
      type: "formation",
      message: `${demandes} demande${demandes > 1 ? "s" : ""} de formation`,
      href: "/admin/formation/demandes",
    });
  return notifications;
}
