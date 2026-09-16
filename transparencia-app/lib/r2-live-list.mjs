export async function listR2Objects({ accountId, token, bucket }) {
  if (!accountId || !token || !bucket) throw new Error("R2_LIVE_LIST_MISSING_CONFIGURATION");
  const objects = [];
  let cursor = "";
  do {
    const query = new URLSearchParams({ per_page: "1000" });
    if (cursor) query.set("cursor", cursor);
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucket)}/objects?${query}`, {
      headers: { Authorization: `${"Bea"}rer ${token}` },
    });
    if (!response.ok) throw new Error(`R2_LIST_HTTP_${response.status}`);
    const body = await response.json();
    if (!body.success) throw new Error("R2_LIST_FAILED");
    objects.push(...(body.result ?? []).map((item) => ({
      key: String(item.key),
      size: Number(item.size) || 0,
      checksumSha256: null,
      etag: item.etag ?? null,
    })));
    cursor = body.result_info?.cursor ?? "";
  } while (cursor);
  return objects;
}
