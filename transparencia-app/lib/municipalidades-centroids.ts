import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { MunicipalidadListItem } from "./municipalidades-list";

export interface MunicipalidadCentroid {
  latitud: number;
  longitud: number;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell.trim());
      cell = "";
    } else {
      cell += character;
    }
  }
  cells.push(cell.trim());
  return cells;
}

function parseDms(value: string): number | null {
  const match = value.match(/(-?\d+(?:\.\d+)?)°\s*(\d+(?:\.\d+)?)['’]\s*(\d+(?:\.\d+)?)["”]/);
  if (!match) return null;
  const degrees = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![degrees, minutes, seconds].every(Number.isFinite)) return null;
  const sign = degrees < 0 ? -1 : 1;
  return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
}

function readCentroids(): Map<string, MunicipalidadCentroid> {
  try {
    const source = readFileSync(join(process.cwd(), "comunas.csv"), "utf8");
    const lines = source.split(/\r?\n/).filter(Boolean);
    const centroids = new Map<string, MunicipalidadCentroid>();
    for (const line of lines.slice(1)) {
      const cells = parseCsvLine(line);
      const cut = cells[0]?.replace(/\D/g, "").padStart(5, "0");
      const latitud = parseDms(cells[10] ?? "");
      const longitud = parseDms(cells[11] ?? "");
      if (cut && latitud !== null && longitud !== null) centroids.set(cut, { latitud, longitud });
    }
    return centroids;
  } catch {
    return new Map();
  }
}

export function getMunicipalidadesWithCentroids(rows: MunicipalidadListItem[]): MunicipalidadListItem[] {
  const centroids = readCentroids();
  return rows.map((row) => {
    const centroid = centroids.get(row.cut.padStart(5, "0"));
    return centroid ? { ...row, ...centroid } : row;
  });
}
