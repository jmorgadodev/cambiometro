import { createHash, webcrypto } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import type {
  DetailPartition,
  PartitionData,
} from "@/lib/parliamentary-explorer";
import { loadExplorerPartition } from "./useExplorerRecords";

function partition(releaseId: string, overrides: Partial<PartitionData> = {}) {
  const body: PartitionData = {
    schemaVersion: 1,
    releaseId,
    rows: [
      {
        id: "record-1",
        memberId: "member-1",
        period: "2026-04",
        component: "gastos",
        category: "Traslados",
        item: "Pasajes",
        amount: 100,
        recordCount: 1,
        sourceLabel: "Fuente de prueba",
        sourceScope: "unavailable",
        releaseId,
      },
    ],
    ...overrides,
  };
  const text = JSON.stringify(body);
  const descriptor: DetailPartition = {
    path: "/data/parliamentary-explorer/partition-test.json",
    sha256: createHash("sha256").update(text).digest("hex"),
    bytes: Buffer.byteLength(text),
    count: body.rows.length,
    period: "2026-04",
    chamber: "camara",
  };
  return { body, text, descriptor };
}

function staticFetch(text: string) {
  const mock = vi
    .fn<typeof fetch>()
    .mockImplementation(async () => new Response(text));
  vi.stubGlobal("fetch", mock);
  // Use real SHA-256, including in Node environments without a browser global.
  vi.stubGlobal("crypto", webcrypto);
  return mock;
}

afterEach(() => vi.unstubAllGlobals());

describe("carga de particiones estáticas verificadas", () => {
  it("rechaza un cuerpo cuyo tamaño difiere del descriptor", async () => {
    const { text, descriptor } = partition("release-size");
    const fetch = staticFetch(text);
    await expect(
      loadExplorerPartition(
        { ...descriptor, bytes: descriptor.bytes + 1 },
        "release-size",
      ),
    ).rejects.toThrow(/versión verificada/);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("rechaza un checksum alterado aunque el tamaño sea correcto", async () => {
    const { text, descriptor } = partition("release-checksum");
    staticFetch(text);
    const altered =
      (descriptor.sha256[0] === "0" ? "1" : "0") + descriptor.sha256.slice(1);
    await expect(
      loadExplorerPartition(
        { ...descriptor, sha256: altered },
        "release-checksum",
      ),
    ).rejects.toThrow(/versión verificada/);
  });

  it("rechaza otro release aunque el cuerpo coincida con su checksum", async () => {
    const { text, descriptor } = partition("release-published");
    staticFetch(text);
    await expect(
      loadExplorerPartition(descriptor, "release-expected"),
    ).rejects.toThrow(/otro release/);
  });

  it("rechaza una fila de otro release dentro de una partición válida", async () => {
    const source = partition("release-row");
    const { text, descriptor } = partition("release-row", {
      rows: source.body.rows.map((row) => ({
        ...row,
        releaseId: "release-obsolete",
      })),
    });
    staticFetch(text);
    await expect(
      loadExplorerPartition(descriptor, "release-row"),
    ).rejects.toThrow(/otro release/);
  });

  it("comparte una descarga concurrente y reutiliza el resultado validado", async () => {
    const { text, body, descriptor } = partition("release-shared");
    const fetch = staticFetch(text);
    const [first, second] = await Promise.all([
      loadExplorerPartition(descriptor, "release-shared"),
      loadExplorerPartition({ ...descriptor }, "release-shared"),
    ]);
    expect(first).toEqual(body);
    expect(second).toEqual(body);
    expect(await loadExplorerPartition(descriptor, "release-shared")).toEqual(
      body,
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(descriptor.path, {
      cache: "force-cache",
    });
  });

  it("no conserva un fallo de descarga y permite reintentar", async () => {
    const { text, body, descriptor } = partition("release-retry");
    const fetch = staticFetch(text);
    fetch.mockResolvedValueOnce(new Response("Unavailable", { status: 503 }));
    await expect(
      loadExplorerPartition(descriptor, "release-retry"),
    ).rejects.toThrow(/503/);
    expect(await loadExplorerPartition(descriptor, "release-retry")).toEqual(
      body,
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("permite recuperar un cuerpo corrupto sin reutilizar el fallo de integridad", async () => {
    const { text, body, descriptor } = partition("release-integrity-retry");
    const fetch = staticFetch(text);
    fetch.mockResolvedValueOnce(
      new Response(text.replace('"amount":100', '"amount":999')),
    );
    await expect(
      loadExplorerPartition(descriptor, "release-integrity-retry"),
    ).rejects.toThrow(/versión verificada/);
    expect(
      await loadExplorerPartition(descriptor, "release-integrity-retry"),
    ).toEqual(body);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
