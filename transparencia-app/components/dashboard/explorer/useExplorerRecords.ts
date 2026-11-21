"use client";
import { useEffect, useMemo, useState } from "react";
import {
  matchingPartitions,
  type DetailPartition,
  type ExplorerData,
  type ExplorerQuery,
  type PartitionData,
} from "@/lib/parliamentary-explorer";
const cache = new Map<string, Promise<PartitionData>>();
export async function loadExplorerPartition(
  part: DetailPartition,
  releaseId: string,
): Promise<PartitionData> {
  const key = releaseId + ":" + part.sha256;
  const previous = cache.get(key);
  if (previous) return previous;
  const promise = (async () => {
    if (!/^\/data\/parliamentary-explorer\/[a-z0-9-]+\.json$/.test(part.path))
      throw new Error("Ruta de detalle no válida");
    const response = await fetch(part.path, { cache: "force-cache" });
    if (!response.ok)
      throw new Error(`No se pudo cargar el detalle (${response.status})`);
    const bytes = await response.arrayBuffer();
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
      (n) => n.toString(16).padStart(2, "0"),
    ).join("");
    if (bytes.byteLength !== part.bytes || hash !== part.sha256)
      throw new Error("El detalle no coincide con la versión verificada");
    const data = JSON.parse(new TextDecoder().decode(bytes)) as PartitionData;
    if (
      data.schemaVersion !== 1 ||
      data.releaseId !== releaseId ||
      data.rows.length !== part.count ||
      data.rows.some(
        (r) => r.releaseId !== releaseId || r.period !== part.period,
      )
    )
      throw new Error("El detalle pertenece a otro release o período");
    return data;
  })();
  cache.set(key, promise);
  promise.catch(() => cache.delete(key));
  return promise;
}
export function useExplorerRecords(
  data: ExplorerData,
  q: ExplorerQuery,
  enabled: boolean,
) {
  const parts = useMemo(() => matchingPartitions(data, q), [data, q]);
  const key = enabled ? parts.map((p) => p.sha256).join(":") : "";
  const [state, setState] = useState<{
    key: string;
    rows: PartitionData["rows"];
    error: string | null;
  }>({ key: "", rows: [], error: null });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    Promise.all(
      parts.map((p) => loadExplorerPartition(p, data.releaseId)),
    ).then(
      (all) => {
        if (live)
          setState({ key, rows: all.flatMap((d) => d.rows), error: null });
      },
      (error) => {
        if (live)
          setState({
            key,
            rows: [],
            error:
              error instanceof Error ? error.message : "Detalle no disponible",
          });
      },
    );
    return () => {
      live = false;
    };
  }, [enabled, key, data.releaseId, retry, parts]);
  return {
    rows: state.key === key ? state.rows : [],
    loading: enabled && state.key !== key,
    error: state.key === key ? state.error : null,
    retry: () => {
      setState({ key: "", rows: [], error: null });
      setRetry((n) => n + 1);
    },
    partitions: parts.length,
  };
}
