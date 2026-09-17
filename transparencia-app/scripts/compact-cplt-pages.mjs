import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { planCpltPageCompaction } from "../lib/cplt-page-compaction.mjs";
import { assertRemoteR2WriteBudget } from "./etl/r2-account-budget.mjs";

const argument=(name,fallback)=>process.argv.find(v=>v.startsWith(name+"="))?.slice(name.length+1) ?? fallback;
const root=resolve(argument("--output","../artifacts/cplt-page-compaction"));
const scope=process.argv.includes("--municipal") ? "funcionarios-v1" : "funcionarios-central-v1";
const batchSize=Number(argument("--batch-size",50));
const maxBatches=Number(argument("--max-batches",1));
const apply=process.argv.includes("--apply");
if (!Number.isInteger(batchSize) || batchSize<1 || batchSize>100 || !Number.isInteger(maxBatches) || maxBatches<1 || maxBatches>100) throw new Error("COMPACTION_BATCH_INVALID");
if (apply && !process.argv.includes("--worker-validated")) throw new Error("COMPACTION_WORKER_VALIDATION_REQUIRED");
const accountId=process.env.CLOUDFLARE_ACCOUNT_ID;
const token=process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) throw new Error("COMPACTION_CREDENTIALS_REQUIRED");
const sha=data=>createHash("sha256").update(data).digest("hex");
const verification=await (await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify",{headers:{Authorization:`${"Bea"}rer ${token}`}})).json();
if (!verification.success || verification.result?.status!=="active") throw new Error("COMPACTION_TOKEN_INVALID");
const client=new AwsClient({accessKeyId:verification.result.id,secretAccessKey:sha(Buffer.from(token)),service:"s3",region:"auto"});
const bucket="transparencia-public-data";
async function request(key,init={}) {
  // The gateway weakens ETags when applying HTTP compression. Use the object's
  // identity representation so conditional PUT compares the actual R2 ETag.
  const response=await client.fetch(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,{...init,headers:{"Accept-Encoding":"identity",...init.headers},signal:AbortSignal.timeout(60000)});
  if (!response.ok) throw new Error(`COMPACTION_HTTP_${response.status}:${key}`);
  return response;
}
async function bytes(key) {return Buffer.from(await (await request(key)).arrayBuffer());}
async function limited(items,operation) {
  let next=0;
  let failure;
  await Promise.all(Array.from({length:6},async()=>{
    while(next<items.length && !failure) {
      const item=items[next++];
      try {await operation(item);} catch(error) {failure ??= error;}
    }
  }));
  if (failure) throw failure;
}
async function put(key,data,type="application/json",ifMatch) {
  const response=await request(key,{method:"PUT",body:data,headers:{"Content-Type":type,...(ifMatch ? {"If-Match":ifMatch} : {})}});
  if (sha(await bytes(key))!==sha(data)) throw new Error("COMPACTION_PUT_CHECKSUM");
  return response.headers.get("etag");
}
await mkdir(root,{recursive:true});
const reportPath=join(root,"report.json");
let report={scope,batches:[],published:false};
try {report=JSON.parse(await readFile(reportPath,"utf8"));} catch { /* New run. */ }
if (report.scope!==scope) throw new Error("COMPACTION_REPORT_SCOPE");
for (let batch=0;batch<maxBatches;batch++) {
  const manifestKey=`projections/${scope}/manifest.json`;
  const manifestResponse=await request(manifestKey);
  const manifestEtag=manifestResponse.headers.get("etag");
  const originalManifest=Buffer.from(await manifestResponse.arrayBuffer());
  const manifest=JSON.parse(originalManifest);
  const indexKey=manifest.searchIndex?.key;
  if (!indexKey) throw new Error("COMPACTION_INDEX_REQUIRED");
  const indexResponse=await request(indexKey);
  const indexEtag=indexResponse.headers.get("etag");
  const originalIndex=Buffer.from(await indexResponse.arrayBuffer());
  if (!manifestEtag || !indexEtag) throw new Error("COMPACTION_CONDITIONAL_WRITE_REQUIRED");
  if (sha(originalIndex)!==manifest.assets.find(item=>item.key===indexKey)?.checksumSha256) throw new Error("COMPACTION_INDEX_CHECKSUM");
  const index=JSON.parse(originalIndex);
  const selected=index.pages.filter(page=>page.key.endsWith(".json")).slice(0,batchSize);
  if (!selected.length) {report.complete=true;break;}
  const buffers=new Map();
  let cursor=0;
  await Promise.all(Array.from({length:4},async()=>{
    while(cursor<selected.length) {
      const page=selected[cursor++];
      const artifact=manifest.assets.find(v=>v.key===page.key);
      const raw=await bytes(page.key);
      if (!artifact || sha(raw)!==artifact.checksumSha256 || raw.length!==artifact.size) throw new Error("COMPACTION_SOURCE_CHECKSUM");
      buffers.set(page.key,raw);
    }
  }));
  const plan=planCpltPageCompaction(manifest,index,buffers);
  plan.rollback.originalIndexBase64=originalIndex.toString("base64");
  plan.rollback.originalManifestBase64=originalManifest.toString("base64");
  const rollback=gzipSync(Buffer.from(JSON.stringify(plan.rollback)),{level:9});
  const rollbackKey=`audit/rollbacks/cplt-pages/${scope}/${sha(rollback)}.json.gz`;
  const dataPuts=[...plan.puts,{key:rollbackKey,data:rollback,contentType:"application/gzip"}];
  const puts=[...dataPuts,{key:indexKey,data:plan.indexBytes},{key:manifestKey,data:plan.manifestBytes}];
  // All originals coexist with every staged object. No deletion is assumed by the budget.
  const budget=await assertRemoteR2WriteBudget({accountId,token,buckets:[bucket],puts:puts.map(v=>({bucket,key:v.key,size:v.data.length})),deletes:[]});
  const entry={generatedAt:new Date().toISOString(),version:manifest.version,rows:selected.reduce((n,p)=>n+p.count,0),pages:selected.length,originalBytes:plan.originalBytes,compressedBytes:plan.compressedBytes,rollbackKey,budget,published:false};
  const local=join(root,sha(originalIndex));
  await mkdir(local,{recursive:true});
  await writeFile(join(local,"rollback.json.gz"),rollback);
  await writeFile(join(local,"plan.json"),JSON.stringify({...entry,objects:plan.rollback.objects},null,2));
  for (const page of plan.puts) await writeFile(join(local,page.key.split("/").at(-1)),page.data);
  if (apply) {
    await limited(dataPuts,item=>put(item.key,item.data,item.contentType));
    if (sha(await bytes(indexKey))!==sha(originalIndex) || sha(await bytes(manifestKey))!==sha(originalManifest)) throw new Error("COMPACTION_BASELINE_CHANGED");
    let activatedIndexEtag;
    let activatedManifestEtag;
    try {
      activatedIndexEtag=await put(indexKey,plan.indexBytes,"application/json",indexEtag);
      activatedManifestEtag=await put(manifestKey,plan.manifestBytes,"application/json",manifestEtag);
      await limited(plan.deletes,key=>request(key,{method:"DELETE"}));
      entry.published=true;
    } catch(error) {
      if (!activatedIndexEtag) throw error;
      if (!activatedManifestEtag) {
        await put(indexKey,originalIndex,"application/json",activatedIndexEtag);
        throw error;
      }
      for (const object of plan.rollback.objects) {
        const restored=gunzipSync(await bytes(object.compressedKey));
        if (sha(restored)!==object.originalChecksumSha256) throw new Error("COMPACTION_ROLLBACK_CHECKSUM",{cause:error});
        await put(object.originalKey,restored);
      }
      await put(indexKey,originalIndex,"application/json",activatedIndexEtag);
      await put(manifestKey,originalManifest,"application/json",activatedManifestEtag);
      throw error;
    }
  }
  report.batches.push(entry);
  report.published=report.batches.some(v=>v.published);
  await writeFile(reportPath,JSON.stringify(report,null,2));
  console.log(JSON.stringify(entry));
  if (!apply) break;
}
await writeFile(reportPath,JSON.stringify(report,null,2));
