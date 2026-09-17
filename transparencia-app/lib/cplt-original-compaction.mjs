import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
const sha=data=>createHash("sha256").update(data).digest("hex");
export function planCpltOriginalCompaction(manifest,index,buffers) {
  const prefix=manifest.searchIndex?.key?.replace(/search_index\.json$/,"");
  if (!prefix) throw new Error("ORIGINAL_COMPACTION_MANIFEST");
  const updated=structuredClone(manifest), puts=[], deletes=[], objects=[];
  let originalBytes=0, compressedBytes=0;
  const quality={rows:0,grossZero:0,grossMissing:0,netAboveGross:0,nameMissing:0,periodMissing:0};
  for (const [key,raw] of buffers) {
    const relative=key.startsWith(prefix)?key.slice(prefix.length):"";
    if (!/^[a-z0-9][a-z0-9_-]*\.json$/.test(relative)) throw new Error("ORIGINAL_COMPACTION_SCOPE");
    const id=relative.slice(0,-5), filter=index.filters?.[`organismo:${id}`];
    if (!filter) throw new Error("ORIGINAL_COMPACTION_PAGED_READER_REQUIRED");
    const artifact=manifest.assets.find(x=>x.key===key);
    if (!artifact || artifact.size!==raw.length || artifact.checksumSha256!==sha(raw)) throw new Error("ORIGINAL_COMPACTION_CHECKSUM");
    const rows=JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length!==filter.count) throw new Error("ORIGINAL_COMPACTION_COUNT");
    for (const row of rows) {
      quality.rows++;
      const gross=row.remuneracion_bruta_mensual, net=row.remuneracion_liquida_mensual;
      if (gross===null || gross===undefined || gross==="") quality.grossMissing++; else if (Number(gross)===0) quality.grossZero++;
      if (typeof gross==="number" && typeof net==="number" && net>gross) quality.netAboveGross++;
      if (!String(row.nombre_completo ?? "").trim()) quality.nameMissing++;
      if (!String(row.fuente_periodo ?? row.periodo ?? "").trim()) quality.periodMissing++;
    }
    const data=gzipSync(raw,{level:9});
    if (!gunzipSync(data).equals(raw)) throw new Error("ORIGINAL_COMPACTION_RESTORE");
    const compressedKey=key+".gz";
    updated.assets=updated.assets.map(x=>x.key===key?{...x,key:compressedKey,size:data.length,checksumSha256:sha(data),encoding:"gzip",originalSize:raw.length,originalChecksumSha256:sha(raw)}:x);
    puts.push({key:compressedKey,data}); deletes.push(key);
    objects.push({originalKey:key,compressedKey,originalSize:raw.length,originalChecksumSha256:sha(raw),checksumSha256:sha(data)});
    originalBytes+=raw.length; compressedBytes+=data.length;
  }
  return {manifest:updated,manifestBytes:Buffer.from(JSON.stringify(updated)+"\n"),puts,deletes,objects,originalBytes,compressedBytes,quality};
}
