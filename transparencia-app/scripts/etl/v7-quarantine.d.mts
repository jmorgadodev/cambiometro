export interface V7Record {
  id?: string;
  remuneracion_bruta_mensual?: number | null;
  horas_extras_mes_anterior?: number | null;
  url?: string | null;
  fuente?: string | null;
  [key: string]: unknown;
}

export interface V7Anomaly<T extends V7Record = V7Record> {
  id: string;
  severity: "ALTA";
  validation: "V7";
  violations: Array<"sueldo_mensual" | "horas_extras">;
  source_url: string | null;
  record: T;
}

export function partitionV7Records<T extends V7Record>(records: T[]): {
  regular: T[];
  anomalies: V7Anomaly<T>[];
};
