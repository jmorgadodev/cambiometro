export function objectReferences(value, result = new Set()) {
  if (typeof value === "string" && /^(projections|indexes|partitions|catalog|entities|sources)\//.test(value)) result.add(value);
  else if (Array.isArray(value)) for (const item of value) objectReferences(item, result);
  else if (value && typeof value === "object") for (const item of Object.values(value)) objectReferences(item, result);
  return result;
}

export function compactionCandidates({ publicObjects, backupObjects, manifests }) {
  const municipal = manifests.find((item) => item.key === "projections/funcionarios-v1/manifest.json")?.value;
  const staticSite = manifests.find((item) => item.key === "projections/static-site-v1/manifest.json")?.value;
  if (!municipal?.version || !staticSite) throw new Error("COMPACTION_ACTIVE_MANIFEST_REQUIRED");
  const references = objectReferences(manifests.map((item) => item.value));
  const protectedPrefixes = new Set([...references].map((key) => key.match(/^(projections\/[^/]+\/(?:versions|releases)\/[^/]+\/)/)?.[1]).filter(Boolean));
  protectedPrefixes.add(`projections/funcionarios-v1/versions/${municipal.version}/`);
  const candidates = [];
  for (const object of publicObjects) {
    if ([...protectedPrefixes].some((prefix) => object.key.startsWith(prefix))) continue;
    const municipalVersion = object.key.match(/^projections\/funcionarios-v1\/versions\/([^/]+)\//)?.[1];
    const staleMunicipal = municipalVersion && municipalVersion < municipal.version;
    const staleStatic = /^projections\/static-site-v1\/releases\/[^/]+\//.test(object.key);
    if (staleMunicipal || staleStatic) candidates.push({ ...object, bucket: "transparencia-public-data", reason: staleMunicipal ? "inactive-municipal-rollback" : "unreferenced-static-release" });
  }
  for (const object of backupObjects) {
    if (/^(?:backup\/\d{4}-\d{2}-\d{2}\/|d1\/\d{4}-\d{2}-\d{2}\/|backup-inventory\.json$)/.test(object.key)) {
      candidates.push({ ...object, bucket: "cambiometro-backups", reason: "lossless-backup-compaction" });
    }
  }
  return { candidates, protectedPrefixes: [...protectedPrefixes].sort() };
}

export function requireVerifiedArchive(object, archived) {
  if (!archived || archived.bucket !== object.bucket || archived.key !== object.key
    || archived.size !== object.size || archived.etag !== object.etag
    || archived.verified !== true || !/^[a-f0-9]{64}$/.test(archived.sha256 ?? "")) {
    throw new Error(`COMPACTION_ARCHIVE_NOT_VERIFIED: ${object.bucket}/${object.key}`);
  }
}

export function mergeCompactObjects(previous, current) {
  const objects = new Map(previous.map((object) => [`${object.bucket}/${object.key}`, object]));
  for (const object of current) {
    const key = `${object.bucket}/${object.key}`;
    const existing = objects.get(key);
    if (existing && existing.sha256 !== object.sha256) throw new Error(`COMPACTION_ARCHIVE_IDENTITY_CONFLICT: ${key}`);
    objects.set(key, object);
  }
  return [...objects.values()];
}
