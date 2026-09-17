import { describe, expect, it } from "vitest";
import { gunzipSync } from "node:zlib";
import { planCpltPageCompaction } from "../../../lib/cplt-page-compaction.mjs";

const prefix="projections/funcionarios-central-v1/versions/test/";
function input() {
  const index={totalRows:1,pageSize:1,pages:[{page:1,key:prefix+"search_index/p-0001.json",count:1}],publicationExclusions:{key:prefix+"excluded.json",count:0}};
  const manifest={version:"test",recordCount:1,searchIndex:{key:prefix+"search_index.json"},assets:[{key:index.pages[0].key,size:500},{key:prefix+"search_index.json",size:300}]};
  const raw=Buffer.from(JSON.stringify([{id:"original",n:"Sofía",b:1234567,p:"2026-07"}])+"\n");
  return {manifest,index,buffers:new Map([[index.pages[0].key,raw]]),raw};
}
describe("compactación reversible de páginas CPLT",()=>{
  it("mantiene bytes, filas y posiciones y conserva instrucciones completas de rollback",()=>{
    const {manifest,index,buffers,raw}=input();
    const plan=planCpltPageCompaction(manifest,index,buffers);
    const page=plan.puts.find(item=>item.key.endsWith("p-0001.json.gz"));
    expect(gunzipSync(page.data)).toEqual(raw);
    expect(plan.index.totalRows).toBe(index.totalRows);
    expect(plan.index.publicationExclusions).toEqual(index.publicationExclusions);
    expect(plan.deletes).toEqual([index.pages[0].key]);
    expect(plan.rollback.objects[0].originalKey).toBe(index.pages[0].key);
    expect(plan.rollback.index).toEqual(index);
    expect(manifest.assets[0].key).not.toContain(".gz");
  });
  it("rechaza filas truncadas antes de preparar una publicación",()=>{
    const {manifest,index,buffers}=input();
    buffers.set(index.pages[0].key,Buffer.from("[]"));
    expect(()=>planCpltPageCompaction(manifest,index,buffers)).toThrow("COMPACTION_PAGE_COUNT");
  });
  it("no elimina objetos ajenos al release activo",()=>{
    const {manifest,index,buffers,raw}=input();
    buffers.set("partitions/historico/records.json",raw);
    expect(()=>planCpltPageCompaction(manifest,index,buffers)).toThrow("COMPACTION_PAGE_SCOPE");
  });
});
