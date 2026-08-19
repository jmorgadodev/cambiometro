/** @param {Record<string, string | undefined>} environment */
export function requireCloudflareDataCredentials(environment = process.env) {
  const accountId = environment.CLOUDFLARE_ACCOUNT_ID?.trim();
  const token = environment.CLOUDFLARE_API_TOKEN?.trim();
  if (!accountId) throw new Error("ETL_MISSING_SECRET: CLOUDFLARE_ACCOUNT_ID");
  if (!token) throw new Error("ETL_MISSING_SECRET: CLOUDFLARE_API_TOKEN (usar CLOUDFLARE_DATA_API_TOKEN en GitHub Actions)");
  return { accountId, token };
}
