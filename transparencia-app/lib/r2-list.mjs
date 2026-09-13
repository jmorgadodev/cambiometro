export function parseR2ListPage(page) {
  const objects = Array.isArray(page?.result)
    ? page.result
    : page?.result?.objects ?? page?.objects ?? [];
  const cursor = page?.result_info?.cursor ?? page?.result?.cursor ?? page?.cursor ?? null;
  return { objects, cursor };
}
