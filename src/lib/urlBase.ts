// Adresse de connexion PostgreSQL. DATABASE_URL si elle est fournie (développement) ;
// sinon assemblée depuis POSTGRES_* (conteneur), identifiants encodés : un mot de passe
// contenant « / », « @ », « : », « # »… ne casse plus l'URL.

type Env = Record<string, string | undefined>;

export function urlBase(env: Env = process.env): string {
  if (env.DATABASE_URL) return env.DATABASE_URL;
  const manquantes = ["POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB"].filter((n) => !env[n]);
  if (manquantes.length) {
    throw new Error(`Base de données : renseigner DATABASE_URL, ou ${manquantes.join(", ")}.`);
  }
  const hote = env.POSTGRES_HOST || "localhost";
  const port = env.POSTGRES_PORT_INTERNE || "5432";
  const e = encodeURIComponent;
  return `postgresql://${e(env.POSTGRES_USER!)}:${e(env.POSTGRES_PASSWORD!)}@${hote}:${port}/${e(env.POSTGRES_DB!)}?schema=public`;
}
