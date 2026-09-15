const PUBLIC_PROJECTION_MANIFESTS = Object.freeze([
  Object.freeze({
    dataset: "funcionarios-v1",
    key: "projections/funcionarios-v1/manifest.json",
  }),
  Object.freeze({
    // The central projection is a separate public variant used for
    // institutions outside the municipal projection. It must be classified
    // as active so retention audits never propose deleting it as orphaned.
    dataset: "funcionarios-central-v1",
    key: "projections/funcionarios-central-v1/manifest.json",
  }),
]);

export function defaultActiveProjectionManifests() {
  return PUBLIC_PROJECTION_MANIFESTS.map((manifest) => ({ ...manifest }));
}
