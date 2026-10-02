import { buildReleaseSet, assertReleaseSetPromotion } from "./release-set.mjs";

export async function shouldRefreshStaticRelease({ accountId, token, productionUrl = "https://cambiometro.impulsacv.cl", fetchImpl = fetch }) {
  if (!accountId || !token) throw new Error("STATIC_REFRESH_CREDENTIALS_REQUIRED");
  const manifestResponse = await fetchImpl(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/transparencia-public-data/objects/projections/static-site-v1/manifest.json`, {
    headers: { Authorization: `${"Bea"}rer ${token}` }, signal: AbortSignal.timeout(15_000),
  });
  if (!manifestResponse.ok) throw new Error(`STATIC_REFRESH_R2_${manifestResponse.status}`);
  const expected = buildReleaseSet(await manifestResponse.json());
  const publishedResponse = await fetchImpl(`${productionUrl}/data/release-set.json?verify=${Date.now()}`, {
    cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (!publishedResponse.ok) throw new Error(`STATIC_REFRESH_PAGES_${publishedResponse.status}`);
  const published = await publishedResponse.json();
  assertReleaseSetPromotion(published, expected, published.releaseSetId);
  return published.releaseSetId !== expected.releaseSetId;
}
