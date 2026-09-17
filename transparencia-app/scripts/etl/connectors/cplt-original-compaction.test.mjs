import { describe, expect, it } from "vitest";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { planCpltOriginalCompaction } from "../../../lib/cplt-original-compaction.mjs";
const prefix="projections/funcionarios-central-v1/versions/test/";
const raw=Buffer.from(JSON.stringify([{id:"original",formacion:"Dato original",remuneracion_bruta_mensual:1234567}])+"\n");
const sha=data=>createHash("sha256").update(data).digest("hex");
describe("compresión de originales con conservación íntegra",()=>{
  it("conserva exactamente los bytes originales y sólo modifica su referencia de almacenamiento",()=>{
    const key=prefix+"org-test.json";
    const manifest={version:"test",recordCount:1,searchIndex:{key:prefix+"search_index.json"},assets:[{key,size:raw.length,checksumSha256:sha(raw)}]};
    const index={filters:{"organismo:org-test":{count:1}}};
    const plan=planCpltOriginalCompaction(manifest,index,new Map([[key,raw]]));
    expect(gunzipSync(plan.puts[0].data)).toEqual(raw);
    expect(plan.manifest.recordCount).toBe(1);
    expect(plan.manifest.assets[0].originalChecksumSha256).toBe(sha(raw));
    expect(plan.deletes).toEqual([key]);
    expect(manifest.assets[0].key).toBe(key);
  });
  it("rechaza un organismo sin índice paginado o con conteo diferente",()=>{
    const key=prefix+"org-test.json";
    const manifest={version:"test",searchIndex:{key:prefix+"search_index.json"},assets:[{key,size:raw.length,checksumSha256:sha(raw)}]};
    expect(()=>planCpltOriginalCompaction(manifest,{filters:{}},new Map([[key,raw]]))).toThrow();
    expect(()=>planCpltOriginalCompaction(manifest,{filters:{"organismo:org-test":{count:2}}},new Map([[key,raw]]))).toThrow();
  });
  it("no toca catálogos, resúmenes, páginas ni históricos ajenos",()=>{
    const manifest={version:"test",searchIndex:{key:prefix+"search_index.json"},assets:[]};
    expect(()=>planCpltOriginalCompaction(manifest,{filters:{}},new Map([["partitions/historico.json",raw]]))).toThrow();
    expect(()=>planCpltOriginalCompaction(manifest,{filters:{}},new Map([[prefix+"search_index.json",raw]]))).toThrow();
  });
});
