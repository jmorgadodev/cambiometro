import type { DataQualityStatus } from "@/lib/data-quality-summary";

export const RELEASE_STATUS_LABELS: Record<DataQualityStatus, string> = {
  completo: "Completo",
  parcial: "Parcial",
  desfasado: "Desfasado",
  no_disponible: "No disponible",
};

export const RELEASE_STATUS_TONES: Record<DataQualityStatus, "ok" | "warn" | "danger" | "muted"> = {
  completo: "ok",
  parcial: "warn",
  desfasado: "warn",
  no_disponible: "muted",
};

export function shortReleaseChecksum(checksum: string | null | undefined): string {
  if (!checksum) return "No publicado";
  if (checksum.length <= 18) return checksum;
  return `${checksum.slice(0, 10)}…${checksum.slice(-8)}`;
}

export function formatReleaseTimestamp(value: string | null | undefined): string {
  if (!value) return "No publicada";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "No publicada";
  return parsed.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "America/Santiago",
  });
}
