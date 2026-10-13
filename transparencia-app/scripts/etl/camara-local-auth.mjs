export function selectCamaraAdvisoriesCredentials(environment, session) {
  const accountId = environment.CLOUDFLARE_ACCOUNT_ID?.trim();
  if (!accountId) throw new Error("CAMARA_ADVISORIES_ACCOUNT_REQUIRED");
  const dataToken = environment.CLOUDFLARE_DATA_API_TOKEN?.trim();
  if (dataToken) return { accountId, token: dataToken };
  if (session?.type !== "oauth" || !session.token?.trim()) throw new Error("CAMARA_ADVISORIES_REAUTH_REQUIRED");
  return { accountId, token: session.token.trim() };
}
