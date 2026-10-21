// Limitation de débit (CONCEPTION § 7) : fenêtre fixe en mémoire, par clé (adresse IP ou
// compte). Suffisant pour une instance unique ; à porter dans Postgres si l'app est répliquée.

export type Limiteur = {
  /** Compte une tentative ; `autorise` faux au-delà de la limite. */
  essayer: (cle: string, instant?: number) => { autorise: boolean; reessayerDansS: number };
};

export function creerLimiteur({
  limite,
  fenetreMs,
}: {
  limite: number;
  fenetreMs: number;
}): Limiteur {
  const seaux = new Map<string, { debut: number; compte: number }>();
  return {
    essayer(cle, instant = Date.now()) {
      // Ménage des fenêtres expirées pour borner la mémoire.
      if (seaux.size > 5000)
        for (const [k, s] of seaux) if (instant - s.debut >= fenetreMs) seaux.delete(k);
      let s = seaux.get(cle);
      if (!s || instant - s.debut >= fenetreMs) {
        s = { debut: instant, compte: 0 };
        seaux.set(cle, s);
      }
      s.compte++;
      return {
        autorise: s.compte <= limite,
        reessayerDansS: Math.max(1, Math.ceil((s.debut + fenetreMs - instant) / 1000)),
      };
    },
  };
}

/** Adresse du client derrière le reverse proxy (première adresse de X-Forwarded-For). */
export function adresseClient(entetes: Headers): string {
  return (
    entetes.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    entetes.get("x-real-ip")?.trim() ||
    "inconnue"
  );
}
