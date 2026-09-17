import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";

const sha = data => createHash("sha256").update(data).digest("hex");
export function planCpltPageCompaction(manifest, index, buffers) {
  const prefix=manifest.searchIndex?.key?.replace(/search_index\.json$/, "search_index/");
  if (!prefix || !Array.isArray(index.pages) || index.pages.reduce((n,p)=>n+p.count,0)!==index.totalRows) throw new Error("COMPACTION_INDEX_INVALID");
  const updatedIndex=structuredClone(index);
  const updatedManifest=structuredClone(manifest);
  const puts=[];
  const deletes=[];
  const rollback={schemaVersion:1,manifest:structuredClone(manifest),index:structuredClone(index),objects:[]};
  let originalBytes=0;
  let compressedBytes=0;
  for (const [key,raw] of buffers) {
    const page=updatedIndex.pages.find(item=>item.key===key);
    if (!page || !key.startsWith(prefix) || !/\/p-\d+\.json$/.test(key)) throw new Error("COMPACTION_PAGE_SCOPE");
    const rows=JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length!==page.count) throw new Error("COMPACTION_PAGE_COUNT");
    const compressed=gzipSync(raw,{level:9});
    if (sha(gunzipSync(compressed))!==sha(raw)) throw new Error("COMPACTION_RESTORE_CHECKSUM");
    const compressedKey=key+".gz";
    page.key=compressedKey;
    updatedManifest.assets=updatedManifest.assets.filter(item=>item.key!==key);
    updatedManifest.assets.push({key:compressedKey,size:compressed.length,checksumSha256:sha(compressed),encoding:"gzip",originalChecksumSha256:sha(raw),originalSize:raw.length});
    puts.push({key:compressedKey,data:compressed,contentType:"application/gzip"});
    deletes.push(key);
    rollback.objects.push({originalKey:key,compressedKey,originalChecksumSha256:sha(raw),originalSize:raw.length,checksumSha256:sha(compressed)});
    originalBytes+=raw.length;
    compressedBytes+=compressed.length;
  }
  const indexBytes=Buffer.from(JSON.stringify(updatedIndex)+"\n");
  const indexKey=manifest.searchIndex.key;
  updatedManifest.assets=updatedManifest.assets.map(item=>item.key===indexKey ? {...item,size:indexBytes.length,checksumSha256:sha(indexBytes)} : item);
  return {index:updatedIndex,manifest:updatedManifest,puts,deletes,rollback,originalBytes,compressedBytes,indexBytes,manifestBytes:Buffer.from(JSON.stringify(updatedManifest)+"\n")};
}
