export function getDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  const databaseUrl = env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required to connect to Neon Postgres.');
  }

  return databaseUrl;
}
