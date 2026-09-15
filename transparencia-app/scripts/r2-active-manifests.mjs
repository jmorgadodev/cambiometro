const PUBLIC_PROJECTION_MANIFESTS = Object.freeze([
  Object.freeze({
    dataset: "funcionarios-v1",
    key: "projections/funcionarios-v1/manifest.json",
  }),
]);

export function defaultActiveProjectionManifests() {
  return PUBLIC_PROJECTION_MANIFESTS.map((manifest) => ({ ...manifest }));
}
