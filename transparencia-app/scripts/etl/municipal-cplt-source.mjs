import fs from "node:fs";
import path from "node:path";

function listMunicipalityFiles(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) return [];
  return fs.readdirSync(directory)
    .filter((fileName) => fileName.startsWith("muni-") && fileName.endsWith(".json"))
    .sort();
}

function inspectCandidate(directory, order) {
  const files = listMunicipalityFiles(directory);
  let nonEmptyCount = 0;
  let recordCount = 0;

  for (const fileName of files) {
    try {
      const parsed = JSON.parse(fs.readFileSync(path.join(directory, fileName), "utf8"));
      if (!Array.isArray(parsed) || parsed.length === 0) continue;
      nonEmptyCount += 1;
      recordCount += parsed.length;
    } catch {
      // Un archivo inválido no puede ganar la selección ni entrar al rebuild.
    }
  }

  return { directory, files, fileCount: files.length, nonEmptyCount, recordCount, order };
}

/**
 * Selecciona el snapshot CPLT municipal más completo disponible localmente.
 * El respaldo histórico puede existir junto a un release hidratado más nuevo;
 * elegir por cantidad de archivos no vacíos evita volver a publicar sólo dos
 * comunas por orden de rutas.
 */
export function selectBestCpltDirectory(root) {
  const projectionRoot = path.join(root, "data", "lake-cplt", "projections", "funcionarios-v1");
  const candidates = [
    path.join(root, "data", "lake", "projections", "funcionarios-v1"),
    path.join(projectionRoot, "current"),
  ];

  const versionsRoot = path.join(projectionRoot, "versions");
  if (fs.existsSync(versionsRoot) && fs.statSync(versionsRoot).isDirectory()) {
    const versions = fs.readdirSync(versionsRoot)
      .filter((version) => fs.statSync(path.join(versionsRoot, version)).isDirectory())
      .sort()
      .reverse();
    candidates.push(...versions.map((version) => path.join(versionsRoot, version)));
  }

  const inspected = candidates
    .filter((directory, index) => candidates.indexOf(directory) === index)
    .map((directory, order) => inspectCandidate(directory, order))
    .filter((candidate) => candidate.nonEmptyCount > 0);

  if (inspected.length === 0) return null;

  inspected.sort((left, right) => (
    right.nonEmptyCount - left.nonEmptyCount ||
    right.recordCount - left.recordCount ||
    left.order - right.order
  ));

  return inspected[0];
}
