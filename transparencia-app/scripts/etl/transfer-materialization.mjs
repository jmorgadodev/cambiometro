export function shouldSkipTransferMaterialization(previousChecksum, nextChecksum) {
  return Boolean(previousChecksum && nextChecksum && previousChecksum === nextChecksum);
}
