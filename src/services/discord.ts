import "server-only";

// Aperçu d'un compte Discord par son identifiant (modale « Ajouter un compte »).
// L'API Discord exige un jeton de bot : sans DISCORD_BOT_TOKEN, l'aperçu est indisponible
// et le pseudo et l'avatar seront récupérés à la première connexion du compte.

export type ProfilDiscord = { pseudo: string; nom: string; avatarUrl: string | null };

export const apercuDisponible = () => Boolean(process.env.DISCORD_BOT_TOKEN);

export async function rechercherProfilDiscord(
  discordId: string,
): Promise<ProfilDiscord | "introuvable" | "indisponible"> {
  const jeton = process.env.DISCORD_BOT_TOKEN;
  if (!jeton) return "indisponible";
  try {
    const reponse = await fetch(`https://discord.com/api/v10/users/${discordId}`, {
      headers: { Authorization: `Bot ${jeton}` },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (reponse.status === 404) return "introuvable";
    if (!reponse.ok) return "indisponible";
    const u = (await reponse.json()) as {
      id: string;
      username: string;
      global_name: string | null;
      avatar: string | null;
    };
    return {
      pseudo: u.username,
      nom: u.global_name ?? u.username,
      avatarUrl: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png` : null,
    };
  } catch {
    return "indisponible";
  }
}
