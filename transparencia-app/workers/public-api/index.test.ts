import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import worker, { listRecordsFromR2, normalizedSearchMatches } from "./index";

function r2Object(value: unknown) {
  if (value instanceof ArrayBuffer) {
    return {
      json: async <T>() => JSON.parse(new TextDecoder().decode(new Uint8Array(value))) as T,
      arrayBuffer: async () => value,
    };
  }
  const encoded = new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value));
  return {
    json: async <T>() => JSON.parse(new TextDecoder().decode(encoded)) as T,
    arrayBuffer: async () => encoded.buffer.slice(encoded.byteOffset, encoded.byteOffset + encoded.byteLength),
  };
}

function fakeBucket(objects: Record<string, unknown>) {
  const requested: string[] = [];
  return {
    requested,
    get: async (key: string) => {
      requested.push(key);
      return Object.prototype.hasOwnProperty.call(objects, key) ? r2Object(objects[key]) : null;
    },
  };
}

function gzipJsonl(records: unknown[]) {
  const data = gzipSync(`${records.map((record) => JSON.stringify(record)).join("\n")}\n`);
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
}

function sha256(data: ArrayBuffer) {
  return createHash("sha256").update(Buffer.from(data)).digest("hex");
}

describe("registros públicos R2", () => {
  it("busca sin distinguir tildes, mayúsculas ni el orden de nombres y apellidos", () => {
    expect(normalizedSearchMatches("KAISER VANESSA", "Vanessa Kaiser Barents-Von Hohenhagen")).toBe(true);
    expect(normalizedSearchMatches("Torrealba Río Sebastián", "RÍO SEBASTIÁN TORREALBA DEL")).toBe(true);
    expect(normalizedSearchMatches("Torrealba inexistente", "RÍO SEBASTIÁN TORREALBA DEL")).toBe(false);
  });

  it("no usa D1 como fallback de búsquedas públicas y conserva autoridades del catálogo local", async () => {
    let d1Calls = 0;
    const response = await worker.fetch(
      new Request("https://example.test/api/v1/search?q=Kaiser"),
      { PUBLIC_DATA: fakeBucket({}) as never, DB: { prepare: () => { d1Calls++; throw new Error("D1 debe permanecer fuera de la búsqueda"); } } as never } as never,
    );
    expect(response.status).toBe(200);
    const payload = await response.json() as { data: { autoridades: Array<{ nombre: string }> } };
    expect(payload.data.autoridades.some((item) => item.nombre.toLocaleLowerCase("es-CL").includes("kaiser"))).toBe(true);
    expect(d1Calls).toBe(0);
  });

  it("consulta un organismo mediante posiciones paginadas, sin descargar su archivo completo", async () => {
    const root="projections/funcionarios-central-v1";
    const bucket=fakeBucket({
      [`${root}/manifest.json`]:{version:"test",generatedAt:"2026-09-14T00:00:00Z",assets:[{key:`${root}/versions/test/org-ine.json`}],searchIndex:{key:`${root}/index.json`}},
      [`${root}/index.json`]:{totalRows:4,pageSize:4,pages:[{page:1,key:`${root}/page.json`,count:4}],publicationExclusions:{key:`${root}/excluded.json`,count:1},filters:{"organismo:org-ine":{key:`${root}/organism.json`,count:3}}},
      [`${root}/organism.json`]:[0,2,3], [`${root}/excluded.json`]:[2],
      [`${root}/page.json`]:[{id:"ine-1",oid:"org-ine",n:"Persona A",p:"2026-07",b:100000},{id:"other",oid:"org-other",n:"Persona B",p:"2026-07",b:100000},{id:"future",oid:"org-ine",n:"Persona C",p:"2029-01",b:100000},{id:"ine-2",oid:"org-ine",n:"Persona D",p:"2026-07",b:100000}],
    });
    const response=await worker.fetch(new Request("https://example.test/api/funcionarios?scope=central&organismo=org-ine&include_zero=true&limit=1&page=2"),{PUBLIC_DATA:bucket as never} as never);
    const payload=await response.json() as {data:Array<{id:string}>;meta:{total:number}};
    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(2);
    expect(payload.data.map(row=>row.id)).toEqual(["ine-2"]);
    expect(bucket.requested).not.toContain(`${root}/versions/test/org-ine.json`);
  });
  it("consulta páginas de remuneraciones comprimidas sin cambiar registros ni paginación", async () => {
    const root = "projections/funcionarios-central-v1";
    const raw = [{id:"salary-original",n:"Sofía Pumpin",p:"2026-07",b:5674763}];
    const compressed = gzipSync(JSON.stringify(raw));
    const bucket = fakeBucket({
      [`${root}/manifest.json`]: {version:"test",generatedAt:"2026-09-14T00:00:00Z",assets:[],searchIndex:{key:`${root}/index.json`}},
      [`${root}/index.json`]: {totalRows:1,pageSize:1,pages:[{page:1,key:`${root}/page.json.gz`,count:1}],filters:{}},
      [`${root}/page.json.gz`]: compressed.buffer.slice(compressed.byteOffset,compressed.byteOffset+compressed.byteLength),
    });
    const response = await worker.fetch(new Request("https://example.test/api/funcionarios?scope=central&include_zero=true"),{PUBLIC_DATA:bucket as never} as never);
    const payload = await response.json() as {data:Array<{id:string;nombre_completo:string;remuneracion_bruta_mensual:number}>;meta:{total:number}};
    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(1);
    expect(payload.data[0]).toMatchObject({id:"salary-original",nombre_completo:"Sofía Pumpin",remuneracion_bruta_mensual:5674763});
  });
  it("no declara disponible una página comprimida corrupta", async () => {
    const root="projections/funcionarios-v1";
    const bucket=fakeBucket({
      [`${root}/manifest.json`]:{version:"test",generatedAt:"2026-09-14T00:00:00Z",assets:[],searchIndex:{key:`${root}/index.json`}},
      [`${root}/index.json`]:{totalRows:1,pageSize:1,pages:[{page:1,key:`${root}/page.json.gz`,count:1}],filters:{}},
      [`${root}/page.json.gz`]:new Uint8Array([0,1,2]).buffer,
    });
    const response=await worker.fetch(new Request("https://example.test/api/funcionarios?scope=municipal"),{PUBLIC_DATA:bucket as never} as never);
    expect(response.status).toBe(503);
  });
  it("excluye períodos fuera del corte antes de contar y paginar sin modificar los originales", async () => {
    const root = "projections/funcionarios-central-v1";
    const bucket = fakeBucket({
      [`${root}/manifest.json`]: {version:"test", generatedAt:"2026-09-14T00:00:00Z", assets:[], searchIndex:{key:`${root}/index.json`}},
      [`${root}/index.json`]: {totalRows:4,pageSize:4,pages:[{page:1,key:`${root}/page.json`,count:4}],publicationExclusions:{key:`${root}/excluded.json`,count:1},filters:{"tipo:servicio":{key:`${root}/service.json`,count:3},"tipo:municipalidad":{key:`${root}/municipal.json`,count:1}}},
      [`${root}/municipal.json`]: [1], [`${root}/excluded.json`]: [2],
      [`${root}/page.json`]: [{id:"valid-1",n:"Persona A",b:100000,p:"2026-07"},{id:"municipal",n:"Persona B",b:100000,p:"2026-07"},{id:"future",n:"Persona C",b:100000,p:"2029-01"},{id:"valid-2",n:"Persona D",b:100000,p:"2026-07"}],
    });
    for (const [page,id] of [[1,"valid-1"],[2,"valid-2"]] as const) {
      const response = await worker.fetch(new Request(`https://example.test/api/funcionarios?scope=central&include_zero=true&limit=1&page=${page}`),{PUBLIC_DATA:bucket as never} as never);
      const payload = await response.json() as {data:Array<{id:string}>;meta:{total:number;totalHeadcount:number}};
      expect(response.status).toBe(200);
      expect(payload.meta.total).toBe(2);
      expect(payload.meta.totalHeadcount).toBe(2);
      expect(payload.data.map(row=>row.id)).toEqual([id]);
    }
    expect(bucket.requested).not.toContain(`${root}/service.json`);
  });
  it("aplica las exclusiones también a una búsqueda nominal", async () => {
    const root = "projections/funcionarios-v1";
    const bucket = fakeBucket({
      [`${root}/manifest.json`]: {version:"test",generatedAt:"2026-09-14T00:00:00Z",assets:[],searchIndex:{key:`${root}/index.json`}},
      [`${root}/index.json`]: {totalRows:2,pageSize:2,pages:[{page:1,key:`${root}/page.json`,count:2}],publicationExclusions:{key:`${root}/excluded.json`,count:1},shards:{pe:`${root}/tokens.json`}},
      [`${root}/tokens.json`]: [["persona",[0,1]]], [`${root}/excluded.json`]: [1],
      [`${root}/page.json`]: [{id:"valid",n:"Persona A",p:"2026-07",b:100000},{id:"future",n:"Persona B",p:"2029-01",b:100000}],
    });
    const response=await worker.fetch(new Request("https://example.test/api/funcionarios?q=persona&include_zero=true"),{PUBLIC_DATA:bucket as never} as never);
    const payload=await response.json() as {data:Array<{id:string}>;meta:{total:number}};
    expect(payload.meta.total).toBe(1);
    expect(payload.data.map(row=>row.id)).toEqual(["valid"]);
  });
  it("un índice de exclusión inconsistente no publica una nómina parcialmente validada", async () => {
    const root = "projections/funcionarios-v1";
    const bucket = fakeBucket({
      [`${root}/manifest.json`]: {version:"test",assets:[],searchIndex:{key:`${root}/index.json`}},
      [`${root}/index.json`]: {totalRows:2,pageSize:2,pages:[{page:1,key:`${root}/page.json`,count:2}],publicationExclusions:{key:`${root}/excluded.json`,count:2}},
      [`${root}/excluded.json`]: [1,1],
    });
    const response=await worker.fetch(new Request("https://example.test/api/funcionarios?scope=municipal"),{PUBLIC_DATA:bucket as never} as never);
    expect(response.status).toBe(503);
    expect(bucket.requested).not.toContain(`${root}/page.json`);
  });
  it("no pierde registros centrales cuando una página combinada cruza una página de la fuente", async () => {
    const objects:Record<string,unknown> = {};
    for (const [name,total] of [["funcionarios-v1",2],["funcionarios-central-v1",4]] as const) {
      const root = `projections/${name}`;
      objects[`${root}/manifest.json`] = {version:"test",generatedAt:"2026-09-15T00:00:00Z",assets:[],searchIndex:{key:`${root}/index.json`}};
      objects[`${root}/index.json`] = {totalRows:total,pageSize:10,pages:[{page:1,key:`${root}/page.json`,count:total}],filters:{}};
      objects[`${root}/page.json`] = Array.from({length:total},(_,i)=>({id:`${name}-${i}`,n:`Nombre ${i}`,b:100000,p:"2026-07"}));
    }
    const bucket = fakeBucket(objects);
    const response = await worker.fetch(new Request("https://example.test/api/funcionarios?scope=all&limit=3&page=2&include_zero=true&sortBy=nombre_asc"), { PUBLIC_DATA: bucket as never } as never);
    const payload = await response.json() as {data:Array<{id:string}>;meta:{total:number}};
    expect(payload.meta.total).toBe(6);
    expect(payload.data.map(row=>row.id)).toEqual(["funcionarios-central-v1-1","funcionarios-central-v1-2","funcionarios-central-v1-3"]);
  });
  it("excluye municipales del alcance central leyendo el complemento pequeño verificado", async () => {
    const root = "projections/funcionarios-central-v1/versions/test";
    const bucket = fakeBucket({
      "projections/funcionarios-central-v1/manifest.json": { version: "test", generatedAt: "2026-09-15T00:00:00Z", assets: [], searchIndex: { key: `${root}/search_index.json` } },
      [`${root}/search_index.json`]: { totalRows: 3, pageSize: 3, pages: [{page:1,key:`${root}/page.json`,count:3}], filters: { "tipo:servicio": {key:`${root}/service.json`,count:2}, "tipo:municipalidad": {key:`${root}/municipal.json`,count:1} } },
      [`${root}/municipal.json`]: [1],
      [`${root}/page.json`]: [
        {id:"central-1",n:"Persona Uno",c:"Asesor",ot:"servicio",p:"2026-07",b:100000},
        {id:"municipal-1",n:"Persona Dos",c:"Asesor",ot:"municipalidad",p:"2026-07",b:100000},
        {id:"central-2",n:"Persona Tres",c:"Asesor",ot:"servicio",p:"2026-07",b:100000},
      ],
    });
    const response = await worker.fetch(new Request("https://example.test/api/funcionarios?scope=central&limit=2&include_zero=true"), { PUBLIC_DATA: bucket as never } as never);
    const payload = await response.json() as {data:Array<{id:string}>;meta:{total:number}};
    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(2);
    expect(payload.data.map(row => row.id).sort()).toEqual(["central-1", "central-2"]);
    expect(bucket.requested).not.toContain(`${root}/service.json`);
  });
  it("consulta primero el índice paginado y evita cargar la proyección estática completa", async () => {
    const line = JSON.stringify({
      id: "chilecompra-1",
      sourceId: "chilecompra",
      kind: "contract",
      occurredAt: "2026-06-01",
      data: { title: "Orden de compra", monto_clp: 1000 },
    }) + "\n";
    const bucket = fakeBucket({
      "projections/static-site-v1/manifest.json": { files: [] },
      "catalog/v1/manifest.json": { sources: [{ id: "chilecompra", recordCount: 1 }] },
      "indexes/v1/chilecompra/manifest.json": {
        schemaVersion: 1,
        sourceId: "chilecompra",
        totalRows: 1,
        pageSize: 50,
        recordArchiveKey: "indexes/v1/chilecompra/records.jsonl",
        pages: [{ offset: 0, length: new TextEncoder().encode(line).byteLength }],
      },
      "indexes/v1/chilecompra/records.jsonl": line,
    });

    const response = await listRecordsFromR2(
      new URL("https://example.test/api/v1/records?source=chilecompra&limit=50"),
      { PUBLIC_DATA: bucket as never },
    );
    const payload = await response!.json() as { data: unknown[]; meta: Record<string, unknown> };

    expect(response!.status).toBe(200);
    expect(payload.data).toHaveLength(1);
    expect(payload.meta.sourceBackend).toBe("r2-lake");
    expect(bucket.requested).not.toContain("projections/static-site-v1/manifest.json");
  });

  it("informa como completo un mes oficial sin sesiones y conserva evidencia de cobertura", async () => {
    const bucket = fakeBucket({
      "catalog/v1/manifest.json": {
        generatedAt: "2026-09-24T00:00:00Z",
        sources: [{
          id: "votaciones_senado",
          coverage: {
            confirmedEmptyPeriods: [{
              period: "2026-02",
              kind: "vote",
              reason: "Las legislaturas 373 y 374 no registran sesiones en febrero de 2026.",
              verifiedAt: "2026-09-24",
              evidenceUrls: [
                "https://tramitacion.senado.cl/wspublico/sesiones.php?legislatura=373",
                "https://tramitacion.senado.cl/wspublico/sesiones.php?legislatura=374",
              ],
            }],
          },
        }],
        partitions: [],
      },
    });

    const response = await listRecordsFromR2(
      new URL("https://example.test/api/v1/records?source=votaciones_senado&kind=vote&period=2026-02&limit=10"),
      { PUBLIC_DATA: bucket as never },
    );
    const payload = await response!.json() as { data: unknown[]; meta: Record<string, unknown> };

    expect(response!.status).toBe(200);
    expect(payload.data).toEqual([]);
    expect(payload.meta).toMatchObject({
      total: 0,
      sourceBackend: "r2-lake",
      sourceStatus: "complete",
      expectedRows: 0,
      missingPartitions: 0,
      periodCoverage: "confirmed-empty",
    });
  });

  it("respeta period en una consulta pública de gastos de Senado", async () => {
    const january = gzipJsonl([{ id: "senado-expense-jan", sourceId: "gastos_senado", kind: "expense", occurredAt: "2026-01-15", data: { title: "Enero" } }]);
    const february = gzipJsonl([{ id: "senado-expense-feb", sourceId: "gastos_senado", kind: "expense", occurredAt: "2026-02-15", data: { title: "Febrero" } }]);
    const januaryPartition = {
      sourceId: "gastos_senado", period: "2026-01", recordCount: 1,
      manifestKey: "partitions/gastos_senado/2026/01/manifest.json", checksumSha256: "jan", releaseTag: "test",
      manifest: { projectionChecksumSha256: "projection", artifacts: [{ key: "partitions/gastos_senado/2026/01/records.jsonl.gz", checksumSha256: sha256(january), releaseAssetName: "jan" }] },
    };
    const februaryPartition = {
      sourceId: "gastos_senado", period: "2026-02", recordCount: 1,
      manifestKey: "partitions/gastos_senado/2026/02/manifest.json", checksumSha256: "feb", releaseTag: "test",
      manifest: { projectionChecksumSha256: "projection", artifacts: [{ key: "partitions/gastos_senado/2026/02/records.jsonl.gz", checksumSha256: sha256(february), releaseAssetName: "feb" }] },
    };
    const bucket = fakeBucket({
      "catalog/v1/manifest.json": { generatedAt: "2026-09-12T00:00:00Z", partitions: [januaryPartition, februaryPartition] },
      [januaryPartition.manifestKey]: januaryPartition.manifest,
      [februaryPartition.manifestKey]: februaryPartition.manifest,
      "partitions/gastos_senado/2026/01/records.jsonl.gz": january,
      "partitions/gastos_senado/2026/02/records.jsonl.gz": february,
    });

    const response = await listRecordsFromR2(
      new URL("https://example.test/api/v1/records?source=gastos_senado&kind=expense&period=2026-01&limit=10"),
      { PUBLIC_DATA: bucket as never },
    );
    const payload = await response!.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response!.status).toBe(200);
    expect(payload.meta.total).toBe(1);
    expect(payload.data.map((row) => row.id)).toEqual(["senado-expense-jan"]);
  });

  it("respeta period en la proyección compacta de gastos", async () => {
    const bucket = fakeBucket({
      "projections/static-site-v1/manifest.json": {
        files: [{ path: "data/lake-subsets/gastos-senado.subset.json", key: "subsets/gastos-senado.json" }],
      },
      "subsets/gastos-senado.json": {
        sourceId: "gastos_senado",
        generatedAt: "2026-09-12T00:00:00Z",
        records: [
          { id: "expense-jan", fecha: "2026-01-15", periodo: "2026-01", nombre: "Senador Enero", item: "ITEM", monto_clp: 1, url: "https://example.test/jan", fuente: "Senado" },
          { id: "expense-feb", fecha: "2026-02-15", periodo: "2026-02", nombre: "Senador Febrero", item: "ITEM", monto_clp: 2, url: "https://example.test/feb", fuente: "Senado" },
        ],
      },
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/v1/records?source=gastos_senado&kind=expense&period=2026-01&limit=10"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(1);
    expect(payload.data.map((row) => row.id)).toEqual(["expense-jan"]);
  });

  it("omite palabras vacías nacionales y consulta ambas nóminas sin cargar su shard gigante", async () => {
    const municipalVersion = "municipal-test";
    const centralVersion = "central-test";
    const municipalManifest = {
      version: municipalVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-v1/versions/${municipalVersion}/search_index.json` },
    };
    const centralManifest = {
      version: centralVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-central-v1/versions/${centralVersion}/search_index.json` },
    };
    const makeIndex = (root: string, version: string, rowKey: string) => ({
      totalRows: 1,
      pageSize: 10,
      pages: [{ page: 1, key: `${root}/versions/${version}/search_index/p-0001.json`, count: 1 }],
      shards: { lu: `${root}/versions/${version}/search_index/lu-001.json` },
      filters: {},
      rowKey,
    });
    const municipalIndex = makeIndex("projections/funcionarios-v1", municipalVersion, "municipal-row");
    const centralIndex = makeIndex("projections/funcionarios-central-v1", centralVersion, "central-row");
    const bucket = fakeBucket({
      "projections/funcionarios-v1/manifest.json": municipalManifest,
      "projections/funcionarios-central-v1/manifest.json": centralManifest,
      [municipalManifest.searchIndex.key]: municipalIndex,
      [centralManifest.searchIndex.key]: centralIndex,
      "projections/funcionarios-v1/versions/municipal-test/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-central-v1/versions/central-test/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-v1/versions/municipal-test/search_index/p-0001.json": [{ id: "municipal-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Municipalidad" }],
      "projections/funcionarios-central-v1/versions/central-test/search_index/p-0001.json": [{ id: "central-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Servicio público" }],
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=all&query=Lucy%20de&include_zero=true&limit=20"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.meta.total).toBe(2);
    expect(payload.data.map((row) => row.id).sort()).toEqual(["central-row", "municipal-row"]);
    expect(bucket.requested.some((key) => key.includes("/de-"))).toBe(false);
  });

  it("no vuelve a leer la misma página R2 al combinar la primera página nacional", async () => {
    const municipalVersion = "municipal-first-page";
    const centralVersion = "central-first-page";
    const municipalManifest = {
      version: municipalVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-v1/versions/${municipalVersion}/search_index.json` },
    };
    const centralManifest = {
      version: centralVersion,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-central-v1/versions/${centralVersion}/search_index.json` },
    };
    const makeIndex = (root: string, version: string, rowKey: string) => ({
      totalRows: 1,
      pageSize: 10,
      pages: [{ page: 1, key: `${root}/versions/${version}/search_index/p-0001.json`, count: 1 }],
      shards: { lu: `${root}/versions/${version}/search_index/lu-001.json` },
      filters: {},
      rowKey,
    });
    const municipalIndex = makeIndex("projections/funcionarios-v1", municipalVersion, "municipal-row");
    const centralIndex = makeIndex("projections/funcionarios-central-v1", centralVersion, "central-row");
    const bucket = fakeBucket({
      "projections/funcionarios-v1/manifest.json": municipalManifest,
      "projections/funcionarios-central-v1/manifest.json": centralManifest,
      [municipalManifest.searchIndex.key]: municipalIndex,
      [centralManifest.searchIndex.key]: centralIndex,
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/lu-001.json": [["lucy", [0]]],
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/p-0001.json": [{ id: "municipal-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Municipalidad" }],
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/p-0001.json": [{ id: "central-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Servicio público" }],
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=all&query=Lucy&include_zero=true&limit=20&page=1"),
      { PUBLIC_DATA: bucket as never } as never,
    );

    expect(response.status).toBe(200);
    const counts = new Map<string, number>();
    for (const key of bucket.requested) counts.set(key, (counts.get(key) ?? 0) + 1);
    for (const key of [
      "projections/funcionarios-v1/manifest.json",
      municipalManifest.searchIndex.key,
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/lu-001.json",
      "projections/funcionarios-v1/versions/municipal-first-page/search_index/p-0001.json",
      "projections/funcionarios-central-v1/manifest.json",
      centralManifest.searchIndex.key,
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/lu-001.json",
      "projections/funcionarios-central-v1/versions/central-first-page/search_index/p-0001.json",
    ]) expect(counts.get(key)).toBe(1);
  });

  it("conserva la nómina municipal si la nómina central falla en una búsqueda combinada", async () => {
    const version = "municipal-only";
    const manifest = {
      version,
      generatedAt: "2026-09-15T00:00:00Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-v1/versions/${version}/search_index.json` },
    };
    const index = {
      totalRows: 1,
      pageSize: 10,
      pages: [{ page: 1, key: `projections/funcionarios-v1/versions/${version}/search_index/p-0001.json`, count: 1 }],
      shards: { lu: `projections/funcionarios-v1/versions/${version}/search_index/lu-001.json` },
      filters: {},
    };
    const bucket = fakeBucket({
      "projections/funcionarios-v1/manifest.json": manifest,
      [manifest.searchIndex.key]: index,
      [`projections/funcionarios-v1/versions/${version}/search_index/lu-001.json`]: [["lucy", [0]]],
      [`projections/funcionarios-v1/versions/${version}/search_index/p-0001.json`]: [{ id: "municipal-row", n: "Lucy Depablos Chacon", c: "Asesora", o: "Municipalidad" }],
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=all&query=Lucy&include_zero=true&limit=20"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.data.map((row) => row.id)).toEqual(["municipal-row"]);
  });

  it("no expone períodos CPLT posteriores al corte del manifiesto", async () => {
    const version = "central-period-guard";
    const manifest = {
      version,
      generatedAt: "2026-09-14T03:51:42.634Z",
      assets: [],
      searchIndex: { key: `projections/funcionarios-central-v1/versions/${version}/search_index.json` },
    };
    const bucket = fakeBucket({
      "projections/funcionarios-central-v1/manifest.json": manifest,
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=central&periodo=2121-01&limit=20"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: unknown[]; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.data).toEqual([]);
    expect(payload.meta.total).toBe(0);
    expect(bucket.requested).toEqual(["projections/funcionarios-central-v1/manifest.json"]);
  });

  it("blinda el alcance central contra filas municipales del release anterior", async () => {
    const version = "central-runtime-scope";
    const root = `projections/funcionarios-central-v1/versions/${version}`;
    const manifest = {
      version,
      generatedAt: "2026-09-14T03:51:42.634Z",
      assets: [],
      searchIndex: { key: `${root}/search_index.json` },
    };
    const index = {
      totalRows: 2,
      pageSize: 10,
      pages: [{ page: 1, key: `${root}/search_index/p-0001.json`, count: 2 }],
      shards: { lu: `${root}/search_index/lu-001.json` },
      filters: {
        "tipo:servicio": { key: `${root}/search_index/filter-service.json`, count: 1 },
        "tipo:municipalidad": { key: `${root}/search_index/filter-municipal.json`, count: 1 },
      },
    };
    const bucket = fakeBucket({
      "projections/funcionarios-central-v1/manifest.json": manifest,
      [manifest.searchIndex.key]: index,
      [`${root}/search_index/lu-001.json`]: [["lucy", [0, 1]]],
      [`${root}/search_index/filter-service.json`]: [0],
      [`${root}/search_index/filter-municipal.json`]: [1],
      [`${root}/search_index/p-0001.json`]: [
        { id: "central-row", n: "Lucy Servicio", c: "Asesora", o: "Ministerio", ot: "servicio_publico", b: 1000000 },
        { id: "municipal-row", n: "Lucy Municipalidad", c: "Asesora", o: "Municipalidad", ot: "municipalidad", b: 900000 },
      ],
    });

    const response = await worker.fetch(
      new Request("https://example.test/api/funcionarios?scope=central&query=Lucy&include_zero=true&limit=20"),
      { PUBLIC_DATA: bucket as never } as never,
    );
    const payload = await response.json() as { data: Array<{ id: string }>; meta: Record<string, unknown> };

    expect(response.status).toBe(200);
    expect(payload.data.map((row) => row.id)).toEqual(["central-row"]);
    expect(payload.meta.total).toBe(1);
    expect(payload.meta.totalHeadcount).toBe(1);
    expect(bucket.requested).toContain(`${root}/search_index/filter-service.json`);
    expect(bucket.requested).not.toContain(`${root}/search_index/filter-municipal.json`);
  });
});
