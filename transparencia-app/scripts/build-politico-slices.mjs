import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { POLITICOS_SEED } from "../lib/politicos-source.ts";
import { readExpenseSubset } from "./expense-release.mjs";

function slugifyNombre(nombre) {
  return nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getPoliticoSlug(p) {
  return slugifyNombre(p.nombre_completo);
}

function normalizeSearchText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A fuzzy match is useful for the official Senate feed because it varies
// punctuation and surname order. It must nevertheless produce one owner per
// record: filtering every politician independently can assign a shared
// surname (for example, two politicians named Bianchi) to multiple slices.
function nameMatchScore(seedName, otherName) {
  const normA = normalizeSearchText(seedName);
  const normB = normalizeSearchText(otherName);
  if (!normA || !normB) return 0;
  if (normA === normB) return 10000;
  if (normA.includes(normB) || normB.includes(normA)) return 8000 - Math.abs(normA.length - normB.length);

  const tokensA = normA.split(" ").filter((t) => t.length > 2);
  const tokensB = normB.split(" ").filter((t) => t.length > 2);
  if (tokensA.length < 2 || tokensB.length < 2) return 0;
  const matches = tokensA.filter((t) => tokensB.includes(t));
  return matches.length >= 2 ? matches.length * 100 - Math.abs(tokensA.length - tokensB.length) : 0;
}

function esProcedimental(vFila) {
  const desc = (vFila.descripcion || "").toLowerCase();
  const tramite = (vFila.tramite || "").toLowerCase();
  const tipo = (vFila.tipo || "").toLowerCase();

  return (
    desc.includes("cuenta") ||
    desc.includes("acta") ||
    desc.includes("acuerdo de comités") ||
    desc.includes("orden del día") ||
    desc.includes("comisión mixta") ||
    desc.includes("postergación") ||
    desc.includes("suspensión") ||
    tramite.includes("cuenta") ||
    tipo.includes("procedimental") ||
    tipo.includes("acuerdo")
  );
}

export function buildAllPoliticoSlices() {
  const polVotPath = resolve("data/politicos-votaciones.json");
  const polVotData = JSON.parse(readFileSync(polVotPath, "utf8"));
  const sessions = polVotData.sessions || {};
  const allVotes = polVotData.votes || {};

  const snapshotPath = resolve("data/snapshot.json");
  const snapshot = existsSync(snapshotPath) ? JSON.parse(readFileSync(snapshotPath, "utf8")) : {};
  const staticExpenses = Object.fromEntries(["gastos_camara", "gastos_senado"].map((sourceId) => {
    const subset = readExpenseSubset(process.cwd(), sourceId);
    return [sourceId, subset?.records ?? null];
  }));
  const expenseSources = {
    ...(snapshot.fuentes ?? {}),
    ...(staticExpenses.gastos_camara ? { gastos_camara: staticExpenses.gastos_camara } : {}),
    ...(staticExpenses.gastos_senado ? { gastos_senado: staticExpenses.gastos_senado } : {}),
  };

  const senateExpensesByPolitico = new Map();
  for (const record of expenseSources.gastos_senado ?? []) {
    const candidates = POLITICOS_SEED
      .filter((politico) => politico.cargo === "Senador")
      .map((politico) => ({ politico, score: nameMatchScore(politico.nombre_completo, record.nombre ?? "") }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || left.politico.id.localeCompare(right.politico.id));
    const best = candidates[0]?.politico;
    if (best) {
      const assigned = senateExpensesByPolitico.get(best.id) ?? [];
      assigned.push(record);
      senateExpensesByPolitico.set(best.id, assigned);
    }
  }

  const paPath = resolve("data/personal-apoyo.json");
  const personalApoyoData = existsSync(paPath) ? JSON.parse(readFileSync(paPath, "utf8")) : null;

  const dipIdsPath = resolve("data/diputados-ids.json");
  const dipIds = existsSync(dipIdsPath) ? JSON.parse(readFileSync(dipIdsPath, "utf8")) : {};

  const slicesDir = resolve("data/politico-slices");
  if (!existsSync(slicesDir)) {
    mkdirSync(slicesDir, { recursive: true });
  }

  const index = {};
  let totalPoliticos = 0;
  let totalVotosIndexados = 0;

  for (const pol of POLITICOS_SEED) {
    totalPoliticos++;
    const slug = getPoliticoSlug(pol);
    const pVotes = allVotes[pol.id] || [];

    const seenSessionIds = new Set();
    const rawVotaciones = [];

    for (const [sessionId, opcion] of pVotes) {
      if (seenSessionIds.has(sessionId)) continue;
      seenSessionIds.add(sessionId);
      const session = sessions[sessionId];
      if (!session) continue;

      rawVotaciones.push({
        votacion: session,
        voto: {
          id: String(pol.id),
          nombre: pol.nombre_completo,
          opcion,
          opcion_valor: "0",
        },
      });
    }

    rawVotaciones.sort((a, b) => (b.votacion.fecha ?? "").localeCompare(a.votacion.fecha ?? ""));

    const companerosPartido = POLITICOS_SEED.filter((p) => p.partido_id === pol.partido_id && p.id !== pol.id);

    const votacionesFila = rawVotaciones.map(({ votacion, voto }) => {
      let consensoPartido = null;
      let esRebelde = false;

      if (companerosPartido.length > 0 && votacion.votos && Array.isArray(votacion.votos)) {
        const votosPartido = votacion.votos.filter((v) =>
          companerosPartido.some((cp) => {
            const normVoto = (v.nombre || "").toLowerCase();
            const normBancada = (cp.nombre_completo || "").toLowerCase();
            return normVoto.includes(normBancada) || normBancada.includes(normVoto);
          })
        );

        if (votosPartido.length > 0) {
          const conteo = {};
          for (const vp of votosPartido) {
            conteo[vp.opcion] = (conteo[vp.opcion] || 0) + 1;
          }
          let maxOpcion = "";
          let maxVotos = -1;
          for (const [opc, cant] of Object.entries(conteo)) {
            if (cant > maxVotos && opc !== "No Vota" && opc !== "Dispensado" && opc !== "Pareo") {
              maxVotos = cant;
              maxOpcion = opc;
            }
          }

          if (maxVotos > 0) {
            consensoPartido = maxOpcion;
            if (voto.opcion !== "No Vota" && voto.opcion !== "Dispensado" && voto.opcion !== "Pareo" && voto.opcion !== consensoPartido) {
              esRebelde = true;
            }
          }
        }
      }

      const item = {
        id: votacion.id,
        fecha: votacion.fecha ?? "",
        descripcion: votacion.descripcion ?? "Votación en sala",
        opcion: voto.opcion,
      };

      if (votacion.quorum) item.quorum = votacion.quorum;
      if (votacion.resultado) item.resultado = votacion.resultado;
      if (votacion.tipo) item.tipo = votacion.tipo;
      if (votacion.boletin) item.boletin = votacion.boletin;
      if (votacion.tramite) item.tramite = votacion.tramite;
      if (votacion.informe) item.informe = votacion.informe;
      if (votacion.url_tramitacion) item.url_tramitacion = votacion.url_tramitacion;
      if (votacion.total_si !== undefined) item.total_si = votacion.total_si;
      if (votacion.total_no !== undefined) item.total_no = votacion.total_no;
      if (votacion.total_abstencion !== undefined) item.total_abstencion = votacion.total_abstencion;
      if (votacion.total_asistencia) item.total_asistencia = votacion.total_asistencia;
      if (votacion.url) item.url = votacion.url;
      if (esRebelde) item.esRebelde = true;
      if (consensoPartido) item.consensoPartido = consensoPartido;

      return item;
    });

    let afirmativo = 0;
    let enContra = 0;
    let abstencion = 0;
    let noVota = 0;
    let pareo = 0;
    let procedimentales = 0;

    for (const v of votacionesFila) {
      const opc = (v.opcion || "").trim().toLowerCase();
      if (opc === "afirmativo" || opc === "a favor") afirmativo++;
      else if (opc === "en contra") enContra++;
      else if (opc === "abstención" || opc === "abstencion") abstencion++;
      else if (opc === "pareo") pareo++;
      else noVota++;

      if (esProcedimental(v)) procedimentales++;
    }

    const total = votacionesFila.length;
    const emitidos = afirmativo + enContra + abstencion;
    const presentes = emitidos + noVota;
    const sustantivos = total - procedimentales;

    totalVotosIndexados += total;

    // Calcular ID de cámara para diputados
    const normalizedName = normalizeSearchText(pol.nombre_completo);
    let diputadoId = null;
    if (pol.cargo === "Diputado") {
      const match = Object.entries(dipIds).find(([id, nombre]) => normalizeSearchText(nombre) === normalizedName);
      if (match) diputadoId = match[0];
    }

    // Calcular personal de apoyo
    let apoyoDiputado = null;
    let apoyoSenador = null;

    if (pol.cargo === "Diputado" && diputadoId && personalApoyoData?.diputados?.[String(diputadoId)]) {
      const dip = personalApoyoData.diputados[String(diputadoId)];
      const filas = dip.personal_apoyo || [];
      apoyoDiputado = {
        diputado: dip,
        total_mensual: filas.reduce((tot, f) => tot + (f.sueldo ?? 0), 0),
        n_personas: filas.length,
        n_contratos: filas.filter((f) => /contrato/i.test(f.tipo ?? "")).length,
        n_honorarios: filas.filter((f) => /honorario/i.test(f.tipo ?? "")).length,
      };
    } else if (pol.cargo === "Senador" && personalApoyoData?.senadores) {
      const normalize = (s) =>
        s
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toUpperCase()
          .trim();

      const targetName = normalize(pol.nombre_completo);
      const targetTokens = targetName.split(/\s+/).filter((t) => t.length >= 3);

      let matched = Object.entries(personalApoyoData.senadores).find(([oficina]) =>
        normalize(oficina).includes(targetName)
      );

      if (!matched) {
        matched = Object.entries(personalApoyoData.senadores).find(([oficina]) => {
          const normOfi = normalize(oficina);
          const matches = targetTokens.filter((t) => normOfi.includes(t)).length;
          return matches >= Math.min(2, targetTokens.length);
        });
      }

      if (matched) {
        const registros = [...matched[1]].sort((a, b) => (b.periodo ?? "").localeCompare(a.periodo ?? ""));
        const total_2026 = registros.reduce((total, r) => total + (r.monto ?? 0), 0);
        const ultimo_mes = registros[0]?.periodo ?? "";
        const asignacion = personalApoyoData.asignacion_senado_2026 ?? null;
        apoyoSenador = {
          registros,
          total_2026,
          ultimo_mes,
          asignacion,
          evaluaciones: {},
        };
      }
    }

    // Calcular gastos
    let gastos = [];
    if (pol.cargo === "Diputado" && diputadoId) {
      gastos = (expenseSources.gastos_camara ?? [])
        .filter((record) => String(record.diputado_id) === diputadoId)
        .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
    } else if (pol.cargo === "Senador") {
      gastos = (senateExpensesByPolitico.get(pol.id) ?? [])
        .sort((a, b) => (b.fecha ?? "").localeCompare(a.fecha ?? ""));
    }

    const entry = {
      id: pol.id,
      slug,
      nombre: pol.nombre_completo,
      cargo: pol.cargo,
      totalVotaciones: total,
      desglose: {
        total,
        afirmativo,
        enContra,
        abstencion,
        noVota,
        pareo,
        procedimentales,
        sustantivos,
        presentes,
        emitidos,
      },
      votos: votacionesFila,
      gastos,
      apoyoDiputado,
      apoyoSenador,
    };

    index[pol.id] = {
      id: pol.id,
      slug,
      nombre: pol.nombre_completo,
      cargo: pol.cargo,
      totalVotaciones: total,
      desglose: entry.desglose,
      votos: votacionesFila,
    };

    // Guardar slice individual (< 200 KB) por ID y por SLUG
    const sliceJson = JSON.stringify(entry);
    writeFileSync(join(slicesDir, `${pol.id}.json`), sliceJson, "utf8");
    writeFileSync(join(slicesDir, `${slug}.json`), sliceJson, "utf8");
  }

  const outputPath = resolve("data/politicos-votaciones-index.json");
  writeFileSync(outputPath, JSON.stringify(index), "utf8");
  mkdirSync(resolve("data/generated"), { recursive: true });
  writeFileSync(
    resolve("data/generated/politico-redirects.json"),
    JSON.stringify(POLITICOS_SEED
      .filter((pol) => pol.id.startsWith("dip-") || pol.id.startsWith("sen-"))
      .map((pol) => ({ from: pol.id, to: getPoliticoSlug(pol) }))),
    "utf8",
  );

  console.log(`[build-politico-slices] Éxito: ${totalPoliticos} parlamentarios procesados (${totalVotosIndexados} votos totales).`);
  console.log(`[build-politico-slices] Slices individuales guardados en data/politico-slices/ (*.json < 200 KB).`);
  console.log(`[build-politico-slices] Índice consolidado guardado en ${outputPath}`);
  return index;
}

if (process.argv[1]?.endsWith("build-politico-slices.mjs")) {
  buildAllPoliticoSlices();
}
