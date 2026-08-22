#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED = ["V1", "V2", "V3", "V4", "V5", "V6", "V7"];
const DEFAULT_REPORTS = ["01-parlamentarios.json", "02-agregados.json", "03-entidades.json"];

export function evaluatePipelineReports(reports) {
  const findings = reports.flatMap((report) => Array.isArray(report?.findings) ? report.findings : []);
  const covered = REQUIRED.filter((validation) => findings.some((finding) => finding.validation === validation));
  const missing = REQUIRED.filter((validation) => !covered.includes(validation));
  const criticalFindings = findings.filter((finding) => finding.status === "CRITICA" || finding.severity === "CRITICA");
  return {
    ok: missing.length === 0 && criticalFindings.length === 0,
    findings: findings.length,
    covered,
    missing,
    critical: criticalFindings.length,
    criticalIds: criticalFindings.map((finding) => String(finding.id ?? "SIN_ID")).sort(),
  };
}

/**
 * Guard de Consistencia Institucional (Tarea H v5):
 * Verifica que los titulares vigentes en gabinete-kast.ts y servicios-publicos.ts
 * coincidan con el último movimiento registrado en /movimientos (o subrogante),
 * y que no existan nombres apócrifos/rumores (ej. Müller como ministro).
 */
export function verifyConsistencyGabineteMovimientos(rootDir) {
  const movPath = join(rootDir, "transparencia-app", "data", "movimientos.json");
  const gabinetePath = join(rootDir, "transparencia-app", "lib", "gabinete-kast.ts");
  const serviciosPath = join(rootDir, "transparencia-app", "lib", "servicios-publicos.ts");

  if (!existsSync(movPath) || !existsSync(gabinetePath) || !existsSync(serviciosPath)) {
    return { ok: true, skipped: true, reason: "Archivos no encontrados en ruta" };
  }

  const movData = JSON.parse(readFileSync(movPath, "utf8"));
  const gabineteText = readFileSync(gabinetePath, "utf8");
  const serviciosText = readFileSync(serviciosPath, "utf8");

  const errors = [];

  // 1. Verificar que no exista Gonzalo Müller en movimientos o catálogo
  const jsonStr = JSON.stringify(movData).toLowerCase();
  if (jsonStr.includes("müller") || jsonStr.includes("muller")) {
    errors.push("CRITICAL: Detectado 'Müller' en movimientos.json (analista, nunca ministro)");
  }

  // 2. Extraer ministros de gabinete-kast.ts
  const ministroRegex = /\{\s*ministerio:\s*"([^"]+)",\s*nombre:\s*"([^"]+)"/g;
  const gabineteMinistros = [];
  let mMatch;
  while ((mMatch = ministroRegex.exec(gabineteText)) !== null) {
    gabineteMinistros.push({ ministerio: mMatch[1], nombre: mMatch[2] });
  }

  // 3. Extraer ministerios de servicios-publicos.ts
  const servRegex = /id:\s*'min-([^']+)',[\s\S]*?nombre:\s*'([^']+)'[\s\S]*?director_jefe_actual:\s*'([^']+)'/g;
  const servMinistros = [];
  let sMatch;
  while ((sMatch = servRegex.exec(serviciosText)) !== null) {
    servMinistros.push({ id: `min-${sMatch[1]}`, nombre: sMatch[2], titular: sMatch[3] });
  }

  // Helper normalizar nombres
  function cleanName(n) {
    return (n || "")
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/\(.*?\)/g, "")
      .replace(/^(don|doña|ministro|ministra|subsecretario|subsecretaria)\s+/g, "")
      .trim();
  }

  // Helper coincidencia de nombres (nombre y apellido principal)
  function namesMatch(n1, n2) {
    const c1 = cleanName(n1);
    const c2 = cleanName(n2);
    if (!c1 || !c2) return false;
    if (c1 === c2 || c1.includes(c2) || c2.includes(c1)) return true;
    const tokens1 = c1.split(/\s+/);
    const tokens2 = c2.split(/\s+/);
    const common = tokens1.filter((t) => tokens2.includes(t));
    return common.length >= 2;
  }

  // Helper para mapear ministerio a clave canónica
  function getMinistryKey(mName) {
    const n = mName.toLowerCase();
    if (n.includes("interior")) return "interior";
    if (n.includes("seguridad")) return "seguridad";
    if (n.includes("segegob") || n.includes("general de gobierno")) return "segegob";
    if (n.includes("segpres") || n.includes("general de la presidencia")) return "segpres";
    if (n.includes("hacienda")) return "hacienda";
    if (n.includes("relaciones exteriores") || n.includes("minrel")) return "minrel";
    if (n.includes("defensa")) return "defensa";
    if (n.includes("justicia")) return "justicia";
    if (n.includes("educacion") || n.includes("educación")) return "educacion";
    if (n.includes("salud")) return "salud";
    if (n.includes("obras publicas") || n.includes("obras públicas") || n.includes("mop")) return "mop";
    if (n.includes("vivienda") || n.includes("minvu")) return "vivienda";
    if (n.includes("agricultura")) return "agricultura";
    if (n.includes("mineria") || n.includes("minería")) return "mineria";
    if (n.includes("transportes") || n.includes("mtt")) return "mtt";
    if (n.includes("bienes nacionales")) return "bienes";
    if (n.includes("energia") || n.includes("energía")) return "energia";
    if (n.includes("medio ambiente") || n.includes("mma")) return "medioambiente";
    if (n.includes("deporte") || n.includes("mindep")) return "deporte";
    if (n.includes("mujer")) return "mujer";
    if (n.includes("cultura")) return "cultura";
    if (n.includes("ciencia")) return "ciencia";
    if (n.includes("economia") || n.includes("economía")) return "economia";
    if (n.includes("trabajo")) return "trabajo";
    if (n.includes("desarrollo social")) return "midesof";
    return n;
  }

  // Check SEGEGOB (Claudio Alvarado)
  const segebogMov = movData.movimientos
    .filter((m) => m.cargo.toLowerCase().includes("secretaria general de gobierno") || m.organismo.toLowerCase().includes("segeg"))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  if (segebogMov) {
    const asume = segebogMov.entro?.nombre || segebogMov.entrante || "";
    if (!namesMatch(asume, "Claudio Alvarado")) {
      errors.push(`SEGEGOB inconsistente: en movimientos asume '${asume}', pero titular es Claudio Alvarado`);
    }
  }

  // Check Deporte (Francisco Riveros)
  const deporteMinMov = movData.movimientos
    .filter((m) => m.cargo.toLowerCase().includes("ministr") && m.cargo.toLowerCase().includes("deporte"))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  if (deporteMinMov) {
    const asume = deporteMinMov.entro?.nombre || deporteMinMov.entrante || "";
    if (!namesMatch(asume, "Francisco Riveros")) {
      errors.push(`Deporte inconsistente: en movimientos asume '${asume}', pero titular es Francisco Riveros Cantuarias`);
    }
  }

  // Check Mujer (Marcia Raphael)
  const mujerMinMov = movData.movimientos
    .filter((m) => m.cargo.toLowerCase().includes("ministr") && (m.cargo.toLowerCase().includes("mujer") || m.organismo.toLowerCase().includes("mujer")))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  if (mujerMinMov) {
    const asume = mujerMinMov.entro?.nombre || mujerMinMov.entrante || "";
    if (!namesMatch(asume, "Marcia Raphael")) {
      errors.push(`Mujer inconsistente: en movimientos asume '${asume}', pero titular es Marcia Raphael Mora`);
    }
  }

  // Check Ciencia (Carolina Rossi)
  const cienciaMinMov = movData.movimientos
    .filter((m) => m.cargo.toLowerCase().includes("ministr") && (m.cargo.toLowerCase().includes("ciencia") || m.organismo.toLowerCase().includes("ciencia")))
    .sort((a, b) => b.fecha.localeCompare(a.fecha))[0];

  if (cienciaMinMov) {
    const asume = cienciaMinMov.entro?.nombre || cienciaMinMov.entrante || "";
    if (!namesMatch(asume, "Carolina Rossi")) {
      errors.push(`Ciencia inconsistente: en movimientos asume '${asume}', pero titular es Carolina Rossi`);
    }
  }

  // Check Coherencia entre gabinete-kast.ts y servicios-publicos.ts
  for (const gm of gabineteMinistros) {
    const gmKey = getMinistryKey(gm.ministerio);
    const sm = servMinistros.find((s) => getMinistryKey(s.nombre) === gmKey);
    if (sm) {
      if (!namesMatch(gm.nombre, sm.titular)) {
        errors.push(`Divergencia Gabinete vs Servicios: ${gm.ministerio} -> Gabinete: '${gm.nombre}' vs Servicios: '${sm.titular}'`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    checkedMinisters: gabineteMinistros.length,
    checkedServicios: servMinistros.length,
  };
}

async function main(argv = process.argv.slice(2)) {
  const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const docs = resolve(root, "docs", "auditoria");
  const paths = argv.length ? argv.map((path) => resolve(path)) : DEFAULT_REPORTS.map((name) => resolve(docs, name));
  const reports = await Promise.all(paths.map(async (path) => JSON.parse(await readFile(path, "utf8"))));
  const result = evaluatePipelineReports(reports);

  // Ejecutar Guard de Consistencia Institucional
  const consistency = verifyConsistencyGabineteMovimientos(root);

  const { criticalIds, ...summary } = result;
  const overallOk = result.ok && consistency.ok;

  console.log(
    JSON.stringify(
      {
        guard: "V1-V7",
        reports: paths,
        ...summary,
        critical_ids_sample: criticalIds.slice(0, 25),
        consistency_guard: {
          ok: consistency.ok,
          checked_ministers: consistency.checkedMinisters,
          checked_servicios: consistency.checkedServicios,
          errors: consistency.errors,
        },
      },
      null,
      2
    )
  );

  if (!overallOk) {
    if (!consistency.ok) {
      console.error("❌ Falló Guard de Consistencia Institucional (Gabinete / Servicios / Movimientos):", consistency.errors);
    }
    process.exitCode = 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.stack ?? error.message);
    process.exitCode = 1;
  });
}
