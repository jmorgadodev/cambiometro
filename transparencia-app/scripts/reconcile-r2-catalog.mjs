import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve,join } from "node:path";
import { gzipSync,gunzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { listR2Objects } from "../lib/r2-live-list.mjs";
import { reconcileReleaseCatalog } from "./etl/reconcile-release-catalog.mjs";
import { assertRemoteR2WriteBudget } from "./etl/r2-account-budget.mjs";

const accountId=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) throw new Error("CATALOG_RECONCILIATION_CREDENTIALS_REQUIRED");
const root=resolve(process.argv.find(v=>v.startsWith("--output="))?.slice(9) ?? "../artifacts/r2-catalog-reconciliation");
const bucket="transparencia-public-data";
const key="catalog/v1/manifest.json";
const headers={Authorization:`${"Bea"}rer ${token}`};
const sha=data=>createHash("sha256").update(data).digest("hex");
const verification=await (await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify",{headers})).json();
if (!verification.success || verification.result?.status!=="active") throw new Error("CATALOG_RECONCILIATION_TOKEN_INVALID");
const client=new AwsClient({accessKeyId:verification.result.id,secretAccessKey:sha(Buffer.from(token)),service:"s3",region:"auto"});
async function request(objectKey,init={}) {
  const response=await client.fetch(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${objectKey.split("/").map(encodeURIComponent).join("/")}`,{...init,signal:AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`CATALOG_RECONCILIATION_HTTP_${response.status}:${objectKey}`);
  return response;
}
async function bytes(objectKey) {return Buffer.from(await (await request(objectKey)).arrayBuffer());}
const original=await bytes(key);
const catalog=JSON.parse(original);
const objects=await listR2Objects({accountId,token,bucket});
const known=new Map(objects.map(object=>[object.key,object]));
const verified=new Map();
const unavailable=[];
const checked=[];
let cursor=0;
await Promise.all(Array.from({length:4},async()=>{
  while(cursor<catalog.partitions.length) {
    const partition=catalog.partitions[cursor++];
    if (!known.has(partition.manifestKey)) {unavailable.push({id:partition.id,reason:"manifest_absent"});continue;}
    const manifest=JSON.parse(await bytes(partition.manifestKey));
    if (manifest.id!==partition.id || manifest.sourceId!==partition.sourceId) throw new Error("CATALOG_RECONCILIATION_IDENTITY");
    const parts=manifest.artifacts.filter(v=>/records.*\.jsonl\.gz(?:\.part-\d+)?$/.test(v.key)).sort((a,b)=>a.key.localeCompare(b.key));
    if (!parts.length || parts.some(part=>!known.has(part.key))) {unavailable.push({id:partition.id,reason:"records_absent"});continue;}
    if (manifest.recordCount===partition.recordCount && manifest.projectionChecksumSha256===partition.checksumSha256) {checked.push(partition.id);continue;}
    const chunks=[];
    for (const part of parts) {
      const data=await bytes(part.key);
      if (sha(data)!==part.checksumSha256 || data.length!==part.size) throw new Error(`CATALOG_RECONCILIATION_ARTIFACT_CHECKSUM:${partition.id}`);
      chunks.push(data);
    }
    const compressed=Buffer.concat(chunks);
    if (sha(compressed)!==manifest.projectionChecksumSha256) throw new Error("CATALOG_RECONCILIATION_PROJECTION_CHECKSUM");
    const raw=gunzipSync(compressed);
    if (manifest.projectionUncompressedChecksumSha256 && sha(raw)!==manifest.projectionUncompressedChecksumSha256) throw new Error("CATALOG_RECONCILIATION_RAW_CHECKSUM");
    const text=raw.toString("utf8").trim();
    const records=text ? text.split("\n").map(line=>JSON.parse(line)) : [];
    if (records.length!==manifest.recordCount || records.some(row=>row.sourceId!==partition.sourceId || !row.id) || new Set(records.map(row=>row.id)).size!==records.length) throw new Error(`CATALOG_RECONCILIATION_RECORD_COUNT:${partition.id}`);
    verified.set(partition.id,manifest);
    checked.push(partition.id);
  }
}));
const result=reconcileReleaseCatalog(catalog,verified,{preserveUnselected:true});
const candidate=Buffer.from(JSON.stringify(result.catalog)+"\n");
const rollback=gzipSync(original,{level:9});
const rollbackKey=`audit/rollbacks/catalog/${sha(original)}.json.gz`;
const report={...result.report,checked:checked.length,unavailable:unavailable.sort((a,b)=>a.id.localeCompare(b.id)),rollbackKey,published:false};
await mkdir(root,{recursive:true});
await writeFile(join(root,"catalog-before.json"),original);
await writeFile(join(root,"catalog-after.json"),candidate);
if (result.report.changedPartitions.length) {
  report.budget=await assertRemoteR2WriteBudget({accountId,token,buckets:[bucket],puts:[{bucket,key:rollbackKey,size:rollback.length},{bucket,key,size:candidate.length}],deletes:[]});
  if (process.argv.includes("--apply")) {
    if (sha(await bytes(key))!==sha(original)) throw new Error("CATALOG_RECONCILIATION_BASELINE_CHANGED");
    await request(rollbackKey,{method:"PUT",body:rollback,headers:{"Content-Type":"application/gzip"}});
    if (sha(await bytes(rollbackKey))!==sha(rollback)) throw new Error("CATALOG_RECONCILIATION_ROLLBACK_INVALID");
    try {
      await request(key,{method:"PUT",body:candidate,headers:{"Content-Type":"application/json"}});
      if (sha(await bytes(key))!==sha(candidate)) throw new Error("CATALOG_RECONCILIATION_UPLOAD_CHECKSUM");
      report.published=true;
    } catch(error) {
      await request(key,{method:"PUT",body:original,headers:{"Content-Type":"application/json"}});
      if (sha(await bytes(key))!==sha(original)) throw new Error("CATALOG_RECONCILIATION_ROLLBACK_FAILED",{cause:error});
      throw error;
    }
  }
}
await writeFile(join(root,"report.json"),JSON.stringify(report,null,2));
console.log(JSON.stringify({checked:report.checked,changed:report.changedPartitions,unavailable:unavailable.length,published:report.published}));
