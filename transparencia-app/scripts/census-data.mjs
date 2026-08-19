import fs from 'fs';
import path from 'path';

const root = process.cwd();
const muniDataPath = path.join(root, "data", "municipalidades-data.json");
const existing = fs.existsSync(muniDataPath) ? JSON.parse(fs.readFileSync(muniDataPath, "utf8")) : {};

export const CENSO_2024_OFICIAL = {};

for (const [id, m] of Object.entries(existing)) {
  const cut = String(m.cut).padStart(5, "0");
  CENSO_2024_OFICIAL[cut] = {
    pop: m.poblacion_censo_2024 || 25000,
    area: m.superficie_km2 || 350.0,
    dwellings: Math.round((m.poblacion_censo_2024 || 25000) / 2.7),
  };
}
