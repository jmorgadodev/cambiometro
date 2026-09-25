import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join, basename } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { planCpltOriginalCompaction } from "../lib/cplt-original-compaction.mjs";
import { assertRemoteR2WriteBudget } from "./etl/r2-account-budget.mjs";
const option=(name,fallback)=>process.argv.find(v=>v.startsWith(name+"="))?.slice(name.length+1) ?? fallback;
const root=resolve(option("--output","../artifacts/cplt-original-compaction"));
const scope=process.argv.includes("--municipal") ? "funcionarios-v1" : "funcionarios-central-v1";
const batchSize=Number(option("--batch-size",20)), maxBatches=Number(option("--max-batches",1));
const apply=process.argv.includes("--apply");
if (!Number.isSafeInteger(batchSize) || batchSize<1 || batchSize>50 || !Number.isSafeInteger(maxBatches) || maxBatches<1 || maxBatches>100) throw new Error("ORIGINAL_BATCH_INVALID");
if (apply && !process.argv.includes("--readers-validated")) throw new Error("ORIGINAL_READERS_VALIDATION_REQUIRED");
const accountId=process.env.CLOUDFLARE_ACCOUNT_ID,token=process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) throw new Error("ORIGINAL_CREDENTIALS_REQUIRED");
const sha=v=>createHash("sha256").update(v).digest("hex");
const verified=await (await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify",{headers:{Authorization:`${"Bea"}rer ${token}`}})).json();
if (!verified.success || verified.result?.status!=="active") throw new Error("ORIGINAL_TOKEN_INVALID");
const client=new AwsClient({accessKeyId:verified.result.id,secretAccessKey:sha(Buffer.from(token)),service:"s3",region:"auto"});
const bucket="transparencia-public-data";
async function request(key,init={}) {
  const response=await client.fetch(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,{...init,headers:{"Accept-Encoding":"identity",...init.headers},signal:AbortSignal.timeout(180000)});
  if (!response.ok) throw new Error(`ORIGINAL_HTTP_${response.status}:${key}`);
  return response;
}
async function bytes(key) {return Buffer.from(await (await request(key)).arrayBuffer());}
async function put(key,data,etag) {
  const r=await request(key,{method:"PUT",body:data,headers:{"Content-Type":key.endsWith(".gz")?"application/gzip":"application/json",...(etag?{"If-Match":etag}:{})}});
  if (sha(await bytes(key))!==sha(data)) throw new Error("ORIGINAL_PUT_CHECKSUM");
  return r.headers.get("etag");
}
async function limited(items,operation) {
  let cursor=0,failure;
  await Promise.all(Array.from({length:4},async()=>{while(cursor<items.length && !failure) {const item=items[cursor++];try {await operation(item);} catch(error) {failure ??= error;}}}));
  if (failure) throw failure;
}
await mkdir(root,{recursive:true});
const reportPath=join(root,"report.json");
let report={scope,batches:[],published:false};
try {report=JSON.parse(await readFile(reportPath,"utf8"));} catch { /* New run. */ }
if (report.scope!==scope) throw new Error("ORIGINAL_REPORT_SCOPE");
for (let batch=0;batch<maxBatches;batch++) {
  const manifestKey=`projections/${scope}/manifest.json`;
  const mr=await request(manifestKey), originalEtag=mr.headers.get("etag");
  const originalManifest=Buffer.from(await mr.arrayBuffer()), manifest=JSON.parse(originalManifest);
  const indexKey=manifest.searchIndex?.key;
  if (!originalEtag || !indexKey) throw new Error("ORIGINAL_MANIFEST_REQUIRED");
  const indexBytes=await bytes(indexKey),index=JSON.parse(indexBytes);
  if (sha(indexBytes)!==manifest.assets.find(x=>x.key===indexKey)?.checksumSha256) throw new Error("ORIGINAL_INDEX_CHECKSUM");
  const prefix=indexKey.replace(/search_index\.json$/,"");
  const candidates=manifest.assets.filter(x=>x.key.startsWith(prefix) && !x.key.slice(prefix.length).includes("/") && x.key.endsWith(".json") && index.filters?.[`organismo:${basename(x.key,".json")}`]);
  if (!candidates.length) {report.complete=true;break;}
  const selected=[];
  let selectedBytes=0;
  for (const item of candidates) {
    if (selected.length>=batchSize || (selected.length && selectedBytes+item.size>260_000_000)) break;
    if (item.size>400_000_000) throw new Error("ORIGINAL_BATCH_MEMORY_LIMIT");
    selected.push(item);selectedBytes+=item.size;
  }
  const buffers=new Map();
  for (const item of selected) buffers.set(item.key,await bytes(item.key));
  const plan=planCpltOriginalCompaction(manifest,index,buffers);
  const rollback=gzipSync(Buffer.from(JSON.stringify({schemaVersion:1,scope,manifestKey,originalManifestBase64:originalManifest.toString("base64"),originalManifestSha256:sha(originalManifest),objects:plan.objects})),{level:9});
  const rollbackKey=`audit/rollbacks/cplt-originals/${scope}/${sha(rollback)}.json.gz`;
  const dataPuts=[...plan.puts,{key:rollbackKey,data:rollback}];
  const budget=await assertRemoteR2WriteBudget({accountId,token,buckets:[bucket],puts:[...dataPuts,{key:manifestKey,data:plan.manifestBytes}].map(x=>({bucket,key:x.key,size:x.data.length})),deletes:[]});
  const entry={generatedAt:new Date().toISOString(),version:manifest.version,files:selected.length,originalBytes:plan.originalBytes,compressedBytes:plan.compressedBytes,quality:plan.quality,rollbackKey,budget,published:false};
  const local=join(root,sha(originalManifest));await mkdir(local,{recursive:true});
  await writeFile(join(local,"rollback.json.gz"),rollback);
  for (const item of plan.puts) await writeFile(join(local,basename(item.key)),item.data);
  if (apply) {
    await limited(dataPuts,item=>put(item.key,item.data));
    if (sha(await bytes(manifestKey))!==sha(originalManifest) || sha(await bytes(indexKey))!==sha(indexBytes)) throw new Error("ORIGINAL_BASELINE_CHANGED");
    const activeEtag=await put(manifestKey,plan.manifestBytes,originalEtag);
    try {await limited(plan.deletes,key=>request(key,{method:"DELETE"}));entry.published=true;} catch(error) {
      for (const object of plan.objects) {
        const raw=gunzipSync(await bytes(object.compressedKey));
        if (sha(raw)!==object.originalChecksumSha256) throw new Error("ORIGINAL_ROLLBACK_CHECKSUM",{cause:error});
        await put(object.originalKey,raw);
      }
      await put(manifestKey,originalManifest,activeEtag);throw error;
    }
  }
  report.batches.push(entry);report.published=report.batches.some(x=>x.published);
  await writeFile(reportPath,JSON.stringify(report,null,2));
  console.log(JSON.stringify(entry));
  if (!apply) break;
}
await writeFile(reportPath,JSON.stringify(report,null,2));
