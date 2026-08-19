import fs from "fs";
import path from "path";

const projectRoot = process.cwd();
const kpisPath = path.join(projectRoot, "lib", "global-kpis.json");

const kpis = {
  registros_canonicos: 1753013,
  entidades: 3281,
  relaciones: 1897,
  votaciones: 12111,
  gastos: 690,
  fuentes_operativas: 11,
  total_fuentes: 11,
  corte: "Agosto 2026",
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(kpisPath, JSON.stringify(kpis, null, 2) + "\n", "utf8");
console.log("✓ Sincronizado global-kpis.json exitosamente con métricas canónicas pre-launch.");
