import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import { AwsClient } from "aws4fetch";
import { appendOrganismPositions } from "../lib/cplt-organism-index.mjs";
import { assertRemoteR2WriteBudget } from "./etl/r2-account-budget.mjs";

const option=(name,fallback)=>process.argv.find(v=>v.startsWith(name+"="))?.slice(name.length+1) ?? fallback;
const root=resolve(option("--output","../artifacts/cplt-organism-index"));
const cacheRoot=option("--page-cache",null);
const scope=process.argv.includes("--municipal") ? "funcionarios-v1" : "funcionarios-central-v1";
const apply=process.argv.includes("--apply");
const accountId=process.env.CLOUDFLARE_ACCOUNT_ID, token=process.env.CLOUDFLARE_API_TOKEN;
if (!accountId || !token) throw new Error("ORGANISM_CREDENTIALS_REQUIRED");
const sha=v=>createHash("sha256").update(v).digest("hex");
const verified=await (await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify",{headers:{Authorization:`${"Bea"}rer ${token}`}})).json();
if (!verified.success || verified.result?.status!=="active") throw new Error("ORGANISM_TOKEN_INVALID");
const client=new AwsClient({accessKeyId:verified.result.id,secretAccessKey:sha(Buffer.from(token)),service:"s3",region:"auto"});
const bucket="transparencia-public-data";
async function request(key,init={}) {
  const r=await client.fetch(`https://${accountId}.r2.cloudflarestorage.com/${bucket}/${key.split("/").map(encodeURIComponent).join("/")}`,{...init,headers:{"Accept-Encoding":"identity",...init.headers},signal:AbortSignal.timeout(60000)});
  if (!r.ok) throw new Error(`ORGANISM_HTTP_${r.status}:${key}`);
  return r;
}
async function bytes(key) {return Buffer.from(await (await request(key)).arrayBuffer());}
async function put(key,data,etag) {
  const r=await request(key,{method:"PUT",body:data,headers:{"Content-Type":key.endsWith(".gz")?"application/gzip":"application/json",...(etag?{"If-Match":etag}:{})}});
  if (sha(await bytes(key))!==sha(data)) throw new Error("ORGANISM_UPLOAD_CHECKSUM");
  return r.headers.get("etag");
}
await mkdir(root,{recursive:true});
const manifestKey=`projections/${scope}/manifest.json`;
const mr=await request(manifestKey), manifestEtag=mr.headers.get("etag");
const originalManifest=Buffer.from(await mr.arrayBuffer()), manifest=JSON.parse(originalManifest);
const indexKey=manifest.searchIndex?.key;
if (!indexKey || !manifestEtag) throw new Error("ORGANISM_MANIFEST_REQUIRED");
const ir=await request(indexKey), indexEtag=ir.headers.get("etag");
const originalIndex=Buffer.from(await ir.arrayBuffer()), index=JSON.parse(originalIndex);
if (!indexEtag || sha(originalIndex)!==manifest.assets.find(x=>x.key===indexKey)?.checksumSha256
  || index.pages.reduce((s,p)=>s+p.count,0)!==index.totalRows) throw new Error("ORGANISM_INDEX_CHECKSUM");
const cached=new Map();
if (cacheRoot) for (const dir of await readdir(cacheRoot,{withFileTypes:true})) {
  if (!dir.isDirectory()) continue;
  for (const file of await readdir(join(cacheRoot,dir.name))) if (/^p-\d+\.json\.gz$/.test(file)) cached.set(file,join(cacheRoot,dir.name,file));
}
const groups=new Map(), ids=new Set();
const quality={rows:0,repeatedIds:0,zeroGross:0,missingGross:0,netAboveGross:0};
for (const page of [...index.pages].sort((a,b)=>a.page-b.page)) {
  const artifact=manifest.assets.find(x=>x.key===page.key);
  if (!artifact) throw new Error("ORGANISM_PAGE_ARTIFACT");
  let data;
  if (cached.has(basename(page.key))) data=await readFile(cached.get(basename(page.key)));
  if (!data || sha(data)!==artifact.checksumSha256) data=await bytes(page.key);
  if (sha(data)!==artifact.checksumSha256 || data.length!==artifact.size) throw new Error("ORGANISM_PAGE_CHECKSUM");
  const raw=page.key.endsWith(".gz")?gunzipSync(data):data;
  if (artifact.originalChecksumSha256 && sha(raw)!==artifact.originalChecksumSha256) throw new Error("ORGANISM_ORIGINAL_CHECKSUM");
  const rows=JSON.parse(raw);
  appendOrganismPositions(groups,page,rows,index.pageSize);
  for (const row of rows) {
    quality.rows++;
    if (!row.id) throw new Error("ORGANISM_RECORD_ID_REQUIRED");
    if (ids.has(row.id)) quality.repeatedIds++; else ids.add(row.id);
    if (row.b===null || row.b===undefined) quality.missingGross++; else if (row.b===0) quality.zeroGross++;
    if (typeof row.b==="number" && typeof row.l==="number" && row.l>row.b) quality.netAboveGross++;
  }
}
if (quality.rows!==index.totalRows) throw new Error("ORGANISM_TOTAL_COUNT");
const updated=structuredClone(index), updatedManifest=structuredClone(manifest), puts=[];
updated.filters ??= {};
for (const [id,positions] of groups) {
  const data=gzipSync(Buffer.from(JSON.stringify(positions)+"\n"),{level:9});
  const key=indexKey.replace(/search_index\.json$/,`search_index/organisms/${id}-${sha(data)}.json.gz`);
  if (key===indexKey) throw new Error("ORGANISM_INDEX_KEY");
  updated.filters[`organismo:${id}`]={key,count:positions.length};
  updatedManifest.assets=updatedManifest.assets.filter(x=>x.key!==key);
  updatedManifest.assets.push({key,size:data.length,checksumSha256:sha(data),encoding:"gzip"});
  puts.push({key,data});
}
const rollback=gzipSync(Buffer.from(JSON.stringify({schemaVersion:1,scope,objects:[{key:indexKey,dataBase64:originalIndex.toString("base64"),checksumSha256:sha(originalIndex)},{key:manifestKey,dataBase64:originalManifest.toString("base64"),checksumSha256:sha(originalManifest)}]})),{level:9});
const rollbackKey=`audit/rollbacks/cplt-organisms/${scope}/${sha(rollback)}.json.gz`;
puts.push({key:rollbackKey,data:rollback});
const indexBytes=Buffer.from(JSON.stringify(updated)+"\n");
updatedManifest.assets=updatedManifest.assets.map(x=>x.key===indexKey?{...x,size:indexBytes.length,checksumSha256:sha(indexBytes)}:x);
const manifestBytes=Buffer.from(JSON.stringify(updatedManifest)+"\n");
const budget=await assertRemoteR2WriteBudget({accountId,token,buckets:[bucket],puts:[...puts,{key:indexKey,data:indexBytes},{key:manifestKey,data:manifestBytes}].map(x=>({bucket,key:x.key,size:x.data.length})),deletes:[]});
const report={generatedAt:new Date().toISOString(),scope,version:manifest.version,organisms:groups.size,quality,rollbackKey,budget,published:false};
await writeFile(join(root,"report.json"),JSON.stringify(report,null,2));
await writeFile(join(root,"rollback.json.gz"),rollback);
await writeFile(join(root,"index.json"),indexBytes);
await writeFile(join(root,"manifest.json"),manifestBytes);
if (apply) {
  let cursor=0, failure;
  await Promise.all(Array.from({length:6},async()=>{while(cursor<puts.length && !failure) {const item=puts[cursor++];try {await put(item.key,item.data);} catch(error) {failure ??= error;}}}));
  if (failure) throw failure;
  if (sha(await bytes(indexKey))!==sha(originalIndex) || sha(await bytes(manifestKey))!==sha(originalManifest)) throw new Error("ORGANISM_BASELINE_CHANGED");
  const activeEtag=await put(indexKey,indexBytes,indexEtag);
  try {await put(manifestKey,manifestBytes,manifestEtag);} catch(error) {await put(indexKey,originalIndex,activeEtag);throw error;}
  report.published=true;
  await writeFile(join(root,"report.json"),JSON.stringify(report,null,2));
}
console.log(JSON.stringify(report));
