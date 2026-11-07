import "server-only";
import { headers } from "next/headers";
import { ErreurMetier } from "@/domaine/types";
import { adresseClient, creerLimiteur } from "./limiteur";

// Limites appliquées par l'application (CONCEPTION § 7), partagées par processus.
const globalLimites = globalThis as unknown as {
  limitesBp?: Record<"connexion" | "envoi" | "formation", ReturnType<typeof creerLimiteur>>;
};
const limites = (globalLimites.limitesBp ??= {
  /** Connexion Discord et retours OAuth : 20 tentatives par minute et par adresse. */
  connexion: creerLimiteur({ limite: 20, fenetreMs: 60_000 }),
  /** Envois de fichiers (photos, justificatifs) : 30 par tranche de 10 minutes et par compte. */
  envoi: creerLimiteur({ limite: 30, fenetreMs: 10 * 60_000 }),
  formation: creerLimiteur({ limite: 5, fenetreMs: 10 * 60_000 }),
});

/** Vrai si la tentative de connexion est autorisée pour l'adresse de la requête. */
export async function connexionAutorisee(entetes?: Headers) {
  return limites.connexion.essayer(adresseClient(entetes ?? (await headers()))).autorise;
}

export async function exigerQuotaDemandeFormation() {
  const r = limites.formation.essayer(adresseClient(await headers()));
  if (!r.autorise)
    throw new ErreurMetier(
      `Trop de demandes de formation : réessayez dans ${Math.ceil(r.reessayerDansS / 60)} min.`,
    );
}

/** Lève une ErreurMetier si le compte a dépassé le nombre d'envois de fichiers. */
export function exigerQuotaEnvoi(compteId: string) {
  const r = limites.envoi.essayer(compteId);
  if (!r.autorise) {
    throw new ErreurMetier(
      `Trop d’envois de fichiers : réessayez dans ${Math.ceil(r.reessayerDansS / 60)} min.`,
    );
  }
}
