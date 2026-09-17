import { describe, expect, it } from "vitest";
import { readFileSync, mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { gunzipSync } from "node:zlib";
import { appendOrganismPositions } from "../../../lib/cplt-organism-index.mjs";
describe("índices de organismos sin copiar registros", () => {
  it("el publicador genera páginas comprimidas e índices por ID para futuros releases", () => {
    const script=readFileSync("scripts/publish-cplt-projections.mjs","utf8");
    expect(script).toContain("appendOrganismPositions");
    expect(script).toContain('encoding: "gzip"');
    expect(script).toContain('filters[`organismo:${id}`]');
  });
  it("conserva posiciones físicas y separa organismos por ID, no por nombre", () => {
    const groups = new Map();
    appendOrganismPositions(groups, {page:1,count:2}, [{oid:"org-a"},{oid:"org-b"}], 2);
    appendOrganismPositions(groups, {page:2,count:1}, [{oid:"org-a"}], 2);
    expect([...groups]).toEqual([["org-a",[0,2]],["org-b",[1]]]);
  });
  it("rechaza páginas incompletas o filas sin identificador", () => {
    expect(()=>appendOrganismPositions(new Map(),{page:1,count:2},[{oid:"org-a"}],2)).toThrow();
    expect(()=>appendOrganismPositions(new Map(),{page:1,count:1},[{}],2)).toThrow();
  });
  it("construye un release real pequeño y permite restaurar todas las filas comprimidas", () => {
    const temp=mkdtempSync(join(tmpdir(),"cambiometro-cplt-publisher-test-"));
    const input=join(temp,"data/raw/transparencia_activa_central");
    const projection=join(input,"projections/funcionarios-v1");
    mkdirSync(projection,{recursive:true});
    mkdirSync(join(input,"validation"),{recursive:true});
    const contracts=["Planta","Contrata","Honorarios","CodigoTrabajo"];
    const rows=contracts.map((tipo_contrato,i)=>({id:`official-${i}`,nombre_completo:`Persona ${i}`,organo_id:"org-test",organo_nombre:"Institución de prueba",organo_tipo:"servicio_publico",cargo:"Profesional",tipo_contrato,fuente_periodo:"2026-07",remuneracion_bruta_mensual:1234567,remuneracion_liquida_mensual:1000000}));
    writeFileSync(join(projection,"org-test.json"),JSON.stringify(rows));
    for (const source of ["planta","contrata","honorarios","codigotrabajo"]) writeFileSync(join(input,"validation",source+".json"),JSON.stringify({status:"valid",sourceId:source,recordCount:1,generatedAt:"2026-09-17T00:00:00Z",sourceUrl:"https://official.example.test/"}));
    const result=spawnSync(process.execPath,[resolve("scripts/publish-cplt-projections.mjs"),"--central","--local-only"],{cwd:temp,encoding:"utf8"});
    expect(result.status,result.stderr).toBe(0);
    const output=join(temp,"data/lake-cplt-central");
    const manifest=JSON.parse(readFileSync(join(output,"projections/funcionarios-central-v1/manifest.json"),"utf8"));
    const index=JSON.parse(readFileSync(join(output,manifest.searchIndex.key),"utf8"));
    expect(index.totalRows).toBe(4);
    expect(index.pages[0].key).toMatch(/\.json\.gz$/);
    const restored=JSON.parse(gunzipSync(readFileSync(join(output,index.pages[0].key))));
    expect(restored.map(row=>row.id)).toEqual(rows.map(row=>row.id));
    const positions=JSON.parse(gunzipSync(readFileSync(join(output,index.filters["organismo:org-test"].key))));
    expect(positions).toEqual([0,1,2,3]);
    expect(manifest.assets.find(x=>x.key===index.pages[0].key).originalSize).toBeGreaterThan(0);
  });
});
