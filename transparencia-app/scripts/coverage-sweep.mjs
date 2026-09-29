import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { POLITICOS_SEED } from "../lib/politicos-source.ts";
import { buildTransferCoverageRow } from "./etl/transfer-coverage.mjs";

function normalizeText(v) {
  return (v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chamberCountsFromSnapshot(polVotData) {
  const sessions = Object.values(polVotData.sessions || {});
  const camaraOfficial = sessions.filter((session) => String(session.id).startsWith("camara-")).length;
  const senadoOfficial = sessions.filter((session) => String(session.id).startsWith("senado-")).length;
  if (camaraOfficial < 1 || senadoOfficial < 1) {
    throw new Error("COVERAGE_VOTACIONES_UNIVERSE_MISSING: el snapshot hidratado no contiene ambas cámaras");
  }
  return { camaraOfficial, senadoOfficial };
}

export async function runCoverageSweep({ silent = false, transferManifest = null, infolobbyCount = null, contraloriaCount = null } = {}) {
  const rows = [];
  let allPassed = true;

  // 1. Cargar datasets indexados
  const polVotPath = resolve("data/politicos-votaciones.json");
  const polVotData = existsSync(polVotPath) ? JSON.parse(readFileSync(polVotPath, "utf8")) : { sessions: {}, votes: {} };
  const personalApoyoPath = resolve("data/personal-apoyo.json");
  const personalApoyoData = existsSync(personalApoyoPath) ? JSON.parse(readFileSync(personalApoyoPath, "utf8")) : { diputados: {}, senadores: {} };
  const diputadosIdsPath = resolve("data/diputados-ids.json");
  const diputadosIdsData = existsSync(diputadosIdsPath) ? JSON.parse(readFileSync(diputadosIdsPath, "utf8")) : {};
  const movimientosPath = resolve("data/movimientos.json");
  const movimientosRaw = existsSync(movimientosPath) ? JSON.parse(readFileSync(movimientosPath, "utf8")) : {};
  const movimientosList = Array.isArray(movimientosRaw) ? movimientosRaw : (movimientosRaw.movimientos || []);
  const movementPolicyPath = resolve("data/movimientos-scope-policy.json");
  const movementPolicy = existsSync(movementPolicyPath) ? JSON.parse(readFileSync(movementPolicyPath, "utf8")) : {};

  // 2. Votaciones de Sala Oficiales vs Indexadas (Período 2026-2030)
  // El snapshot hidratado desde R2 es el release que consume Pages. No usar
  // constantes históricas ni una consulta externa que pueda devolver un
  // subconjunto temporal: aquí comprobamos la integridad del mismo universo
  // que será publicado, y fallamos si falta una cámara.
  const { camaraOfficial, senadoOfficial } = chamberCountsFromSnapshot(polVotData);
  const totalOficialVotaciones = camaraOfficial + senadoOfficial;
  const indexadasVotaciones = Object.keys(polVotData.sessions || {}).length;
  const passVotaciones = totalOficialVotaciones > 0 && indexadasVotaciones > 0;
  if (!passVotaciones) allPassed = false;

  rows.push({
    modulo: "Votaciones Sala Período 2026-2030",
    indexado: `${indexadasVotaciones} eventos`,
    universo: `${totalOficialVotaciones} sesiones del snapshot`,
    cobertura: "No medida",
    umbral: "Ambas cámaras presentes",
    estado: passVotaciones ? "CHECKED" : "FAIL",
    nota: `Conteo interno del snapshot: ${camaraOfficial} Cámara + ${senadoOfficial} Senado; falta denominador oficial independiente`,
  });

  // 3. Muestra Obligatoria de Parlamentarios (Kaiser, Bianchi K., Bianchi C., Winter, Cariola, Schalper)
  const muestraAudit = [
    { id: "sen-038", label: "Vanessa Kaiser (Senadora)", cargo: "Senador", esperado: senadoOfficial },
    { id: "sen-048", label: "Karim Bianchi (Senador)", cargo: "Senador", esperado: senadoOfficial },
    { id: "dip-154", label: "Carlos Bianchi (Diputado)", cargo: "Diputado", esperado: camaraOfficial },
    { id: "dip-057", label: "Gonzalo Winter (Diputado)", cargo: "Diputado", esperado: camaraOfficial },
    { id: "sen-017", label: "Karol Cariola (Senadora)", cargo: "Senador", esperado: senadoOfficial },
    { id: "dip-068", label: "Diego Schalper (Diputado)", cargo: "Diputado", esperado: camaraOfficial },
  ];

  for (const item of muestraAudit) {
    const pol = POLITICOS_SEED.find((p) => p.id === item.id);
    const pVotes = pol && polVotData.votes?.[pol.id] ? polVotData.votes[pol.id] : [];
    const passP = item.esperado > 0 && pVotes.length > 0 && pVotes.length <= item.esperado;
    if (!passP) allPassed = false;

    rows.push({
      modulo: `  ↳ Votos ${item.label}`,
      indexado: `${pVotes.length} votos`,
      universo: `${item.esperado} sesiones del snapshot`,
      cobertura: "No medida",
      umbral: "Registro presente; sin denominador oficial",
      estado: passP ? "CHECKED" : "FAIL",
      nota: `${pVotes.length} registros en el snapshot; no es porcentaje de asistencia ni de cobertura oficial`,
    });
  }

  // 4. Personal de Apoyo (Nómina Vigente de Ambas Cámaras)
  // Cámara: 155 diputados electos vigentes
  const activeDipIds = Object.keys(diputadosIdsData);
  const activeDipWithStaff = activeDipIds.filter((id) => personalApoyoData.diputados?.[id]);
  const dipIndexadosVigentes = activeDipWithStaff.length;
  const dipTotalVigentes = 155;
  const passDipApoyo = dipIndexadosVigentes > 0 && dipIndexadosVigentes <= dipTotalVigentes;
  if (!passDipApoyo) allPassed = false;

  rows.push({
    modulo: "Personal Apoyo Cámara (presencia por escaño)",
    indexado: `${dipIndexadosVigentes} diputados`,
    universo: `${dipTotalVigentes} escaños`,
    cobertura: "No medida",
    umbral: "Presencia de filas; no integridad de nómina",
    estado: passDipApoyo ? "CHECKED" : "FAIL",
    nota: `${dipIndexadosVigentes}/${dipTotalVigentes} escaños con una entrada asociada; sin validar universo de contratos`,
  });

  // Senado: 50 senadores electos vigentes
  const activeSenators = POLITICOS_SEED.filter((p) => p.cargo === "Senador");
  const senKeys = Object.keys(personalApoyoData.senadores || {});
  let senIndexadosVigentes = 0;
  for (const s of activeSenators) {
    const sTokens = new Set(normalizeText(s.nombre_completo).split(" "));
    const found = senKeys.find((k) => {
      const kTokens = normalizeText(k).split(" ");
      const matchCount = kTokens.filter((t) => sTokens.has(t)).length;
      return matchCount >= 2 && (sTokens.has(kTokens[0]) || sTokens.has(kTokens[1]));
    });
    if (found) senIndexadosVigentes++;
  }

  const senTotalVigentes = 50;
  const passSenApoyo = senIndexadosVigentes > 0 && senIndexadosVigentes <= senTotalVigentes;
  if (!passSenApoyo) allPassed = false;

  rows.push({
    modulo: "Personal Apoyo Senado (presencia por escaño)",
    indexado: `${senIndexadosVigentes} senadores`,
    universo: `${senTotalVigentes} escaños`,
    cobertura: "No medida",
    umbral: "Presencia de filas; no integridad de nómina",
    estado: passSenApoyo ? "CHECKED" : "FAIL",
    nota: `${senIndexadosVigentes}/${senTotalVigentes} escaños con una entrada asociada; conciliación nominal no demuestra integridad`,
  });

  // 5. Movimientos de Autoridades (Benchmark Oficial BCN / Diario Oficial)
  const totalMovimientos = movimientosList.length;
  // El universo ya no es el benchmark histórico de 79 filas: el release
  // vigente está explícitamente acotado al corte reconciliado de 46 salidas.
  // Mantener el fallback histórico sólo permite auditar snapshots antiguos;
  // no debe convertir el release validado en un falso déficit de cobertura.
  const reconciledMovementRelease = movimientosRaw.release_status === "published_reconciled"
    && movementPolicy.status === "validated_reconciled"
    && Number(movementPolicy.targetCount) > 0;
  const benchmarkMovimientos = reconciledMovementRelease ? Number(movementPolicy.targetCount) : 79;
  const cobMov = benchmarkMovimientos > 0 ? (totalMovimientos / benchmarkMovimientos) * 100 : 0;
  const passMov = reconciledMovementRelease ? totalMovimientos === benchmarkMovimientos : cobMov >= 95.0;
  if (!passMov) allPassed = false;

  rows.push({
    modulo: "Movimientos Autoridades (Diario Oficial / Ley Chile)",
    indexado: `${totalMovimientos} movimientos documentados`,
    universo: `${benchmarkMovimientos} benchmark`,
    cobertura: `${cobMov.toFixed(1)}%`,
    umbral: "≥ 95.0%",
    estado: passMov ? "PASS" : "FAIL",
    nota: reconciledMovementRelease
      ? `Release reconciliado: ${movementPolicy.cutoffDate ?? "corte vigente"}`
      : "Gabinete, Subsecretarios, Delegados, Seremis",
  });

  // 6. Universos Canónicos vs Manifest
  const transferManifestPath = resolve("public/data/transferencias/manifest.json");
  const transferSummaryPath = resolve("data/generated/transferencias/summary.json");
  const transferFallbackPath = resolve("data/lake/projections/v1/ley19862-summary.json");
  const transferPath = [transferManifestPath, transferSummaryPath, transferFallbackPath].find((path) => existsSync(path));
  const transferData = transferManifest ?? (transferPath ? JSON.parse(readFileSync(transferPath, "utf8")) : {});
  const transferCoverage = transferManifest || transferPath?.endsWith("manifest.json")
    ? buildTransferCoverageRow({ totalRows: transferData.totalRows, totalMontoClp: transferData.expected?.totalMontoClp })
    : buildTransferCoverageRow({ totalRows: transferData.kpis?.total_transfers, totalMontoClp: transferData.kpis?.total_monto_clp });
  const normalizedInfoLobbyCount = Number.isInteger(infolobbyCount) && infolobbyCount > 0 ? infolobbyCount : null;
  const formattedInfoLobbyCount = normalizedInfoLobbyCount?.toLocaleString("es-CL") ?? "No verificado";
  const normalizedContraloriaCount = Number.isInteger(contraloriaCount) && contraloriaCount > 0 ? contraloriaCount : null;
  const universos = [
    transferCoverage,
    { modulo: "ChileCompra (auditoría profunda pendiente)", indexado: "No evaluado en esta fase", universo: "No medido", cobertura: "No medida", umbral: "Pendiente última fase", estado: "NO MEDIDA", nota: "Volumen alto; sin conteos ni porcentaje de cobertura inferidos", pass: true, measured: false },
    { modulo: "InfoLobby Audiencias", indexado: normalizedInfoLobbyCount ? `${formattedInfoLobbyCount} audiencias` : "Conteo no disponible", universo: "No medido frente al origen", cobertura: "No medida", umbral: "N/A", estado: "NO MEDIDA", nota: "Conteo de release productivo; sin denominador oficial independiente", pass: true, measured: false },
    { modulo: "Contraloría General (CGR) Auditorías", indexado: normalizedContraloriaCount ? `${normalizedContraloriaCount.toLocaleString("es-CL")} informes publicados` : "Conteo no disponible", universo: "No medido frente al origen", cobertura: "No medida", umbral: "N/A", estado: "NO MEDIDA", nota: "El conteo publicado no establece por sí solo la cobertura del portal CGR", pass: true, measured: false },
  ];

  for (const u of universos) {
    if (!u.pass) allPassed = false;
    if (u.measured === false) {
      rows.push({
        modulo: u.modulo,
        indexado: u.indexado,
        universo: u.universo,
        cobertura: u.cobertura,
        umbral: u.umbral,
        estado: u.estado,
        nota: u.nota,
      });
      continue;
    }
    rows.push({
      modulo: u.modulo,
      indexado: u.indexado,
      universo: u.universo,
      cobertura: "100.0%",
      umbral: "= 100.0%",
      estado: u.pass ? "PASS" : "FAIL",
      nota: u.nota,
    });
  }

  if (!silent) {
    console.log("========================================================================================================================");
    console.log("  BARRIDO DE COBERTURA Y CONCORDANCIA OFICIAL — EL CAMBIÓMETRO");
    console.log("========================================================================================================================");
    console.log(
      "| " +
      "Módulo / Métrica".padEnd(46) + " | " +
      "Indexado".padEnd(23) + " | " +
      "Referencia/denominador".padEnd(22) + " | " +
      "Cobertura".padEnd(10) + " | " +
      "Umbral".padEnd(10) + " | " +
      "Estado".padEnd(6) + " | " +
      "Nota / Alcance".padEnd(32) + " |"
    );
    console.log("|" + "-".repeat(48) + "|" + "-".repeat(25) + "|" + "-".repeat(24) + "|" + "-".repeat(12) + "|" + "-".repeat(12) + "|" + "-".repeat(8) + "|" + "-".repeat(34) + "|");

    for (const r of rows) {
      const mark = r.estado === "PASS" ? "✅ PASS" : r.estado === "CHECKED" ? "✅ CHECK" : r.estado === "NO MEDIDA" ? "— N/M" : "❌ FAIL";
      console.log(
        "| " +
        r.modulo.padEnd(46) + " | " +
        r.indexado.padEnd(23) + " | " +
        r.universo.padEnd(22) + " | " +
        r.cobertura.padEnd(10) + " | " +
        r.umbral.padEnd(10) + " | " +
        mark.padEnd(6) + " | " +
        (r.nota || "").padEnd(32) + " |"
      );
    }
    console.log("========================================================================================================================");
    const unmeasuredCount = rows.filter(({ estado }) => estado === "NO MEDIDA" || estado === "CHECKED").length;
    console.log(`Resultado General: ${allPassed ? `✅ Checks de integridad aprobados; ${unmeasuredCount} coberturas/universos sin medición completa` : "❌ CHECKS DE INTEGRIDAD INCUMPLIDOS — CI ROJO"}\n`);
  }

  return { passed: allPassed, rows, unmeasuredCount: rows.filter(({ estado }) => estado === "NO MEDIDA" || estado === "CHECKED").length };
}

if (process.argv[1]?.endsWith("coverage-sweep.mjs")) {
  runCoverageSweep().then(({ passed }) => {
    if (!passed) {
      console.error("[coverage-sweep] Fallo de cobertura en uno o más módulos.");
      process.exit(1);
    }
  });
}
