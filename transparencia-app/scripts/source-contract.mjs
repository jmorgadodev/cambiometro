export function findLandingTransferSource(sources) {
  return (Array.isArray(sources) ? sources : []).find(
    (source) => source?.id === "ley-19862" || source?.id === "ley19862",
  );
}
