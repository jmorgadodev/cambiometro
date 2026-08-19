/**
 * workers/etl/cron.ts
 * Cloudflare Worker — Pipeline ETL Nocturno Automatizado
 *
 * Programación: Todos los días a las 00:01 AM CLT (04:01 UTC)
 * Cron Trigger: "1 4 * * *" (configurado en wrangler.toml)
 *
 * Flujo de ejecución:
 *   1. Ingesta deltas desde InfoProbidad, Congreso OpenData e InfoLobby.
 *   2. Actualización de entidades y gastos en Cloudflare D1.
 *   3. Ejecución del Detector de Nepotismo (coincidencia de apellidos).
 *   4. Cálculo del Índice de Complejidad Territorial y Gastos Ajustados.
 *   5. Recálculo del Score de Probidad Unificado (0-100) para las 205 autoridades.
 *   6. Inserción en `historial_scores` para la línea de tiempo.
 *   7. Invalidación del cache global en Cloudflare KV.
 *   8. Escritura del registro auditado en Cloudflare R2 (`logs/etl/YYYY-MM-DD.json`).
 *   9. Notificaciones automáticas a Telegram/Discord en caso de banderas rojas críticas.
 */

import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { MOVIMIENTOS } from "@/lib/movimientos";
import { detectarNepotismo } from "./algorithms/nepotismo";
import { fetchInfoProbidadRecientes } from "./scrapers/infoprobidad";
import { fetchGastosCongresoMes } from "./scrapers/congreso-gastos";
import { fetchAudienciasLobby } from "./scrapers/infolobby";

export interface Env {
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  CACHE?: KVNamespace;
  TELEGRAM_BOT_TOKEN?: string;
  DISCORD_WEBHOOK_URL?: string;
  ENVIRONMENT: string;
}

export interface ETLSummary {
  fecha_ejecucion: string;
  hora_chile: string;
  duracion_ms: number;
  autoridades_procesadas: number;
  declaraciones_ingresadas: number;
  gastos_actualizados: number;
  audiencias_lobby_ingresadas: number;
  alertas_nepotismo_detectadas: number;
  alertas_criticas_disparadas: number;
  errores: string[];
}

const worker = {
  /**
   * Disparador programado de Cloudflare Workers Cron (00:01 CLT / 04:01 UTC)
   */
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const startTime = Date.now();
    const ahoraChile = new Date().toLocaleString("es-CL", { timeZone: "America/Santiago" });
    console.log(`[ETL 00:01 AM CLT] Iniciando pipeline automatizado de El Cambiómetro — ${ahoraChile}`);

    const summary: ETLSummary = {
      fecha_ejecucion: new Date().toISOString(),
      hora_chile: ahoraChile,
      duracion_ms: 0,
      autoridades_procesadas: 0,
      declaraciones_ingresadas: 0,
      gastos_actualizados: 0,
      audiencias_lobby_ingresadas: 0,
      alertas_nepotismo_detectadas: 0,
      alertas_criticas_disparadas: 0,
      errores: [],
    };

    // ─── PASO 1: Ingesta de Datos desde Fuentes Públicas ───────────────────
    try {
      const declaraciones = await fetchInfoProbidadRecientes();
      summary.declaraciones_ingresadas = declaraciones.length;
    } catch (err) {
      summary.errores.push(`InfoProbidad Scraper: ${String(err)}`);
    }

    try {
      const now = new Date();
      const gastos = await fetchGastosCongresoMes(now.getFullYear(), now.getMonth() + 1);
      summary.gastos_actualizados = gastos.length;
    } catch (err) {
      summary.errores.push(`Congreso OpenData Scraper: ${String(err)}`);
    }

    try {
      const fechaDesde = new Date(Date.now() - 24 * 3600 * 1000).toISOString().split("T")[0];
      const audiencias = await fetchAudienciasLobby(fechaDesde);
      summary.audiencias_lobby_ingresadas = audiencias.length;
    } catch (err) {
      summary.errores.push(`InfoLobby Scraper: ${String(err)}`);
    }

    // ─── PASO 2: Sincronización de las 205 Autoridades en D1 ─────────────
      // NOTA: el RUT no se persiste. Las fuentes oficiales no publican RUT y el
      // modelo expuesto (lib/politicos.ts) ya lo retira; insertarlo sería
      // persistir un dato simulado en producción.
      if (env.DB) {
        try {
          for (const pol of POLITICOS_SEED) {
            await env.DB
              .prepare(`
                INSERT INTO politicos (id, nombre_completo, cargo, partido_id, distrito_region, twitter_handle)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  nombre_completo = excluded.nombre_completo,
                  cargo = excluded.cargo,
                  partido_id = excluded.partido_id,
                  distrito_region = excluded.distrito_region,
                  twitter_handle = excluded.twitter_handle
              `)
              .bind(pol.id, pol.nombre_completo, pol.cargo, pol.partido_id, pol.distrito_region, pol.twitter_handle || null)
              .run();

          summary.autoridades_procesadas++;
        }
      } catch (err) {
        summary.errores.push(`D1 Politicos Sync: ${String(err)}`);
      }

      // ─── PASO 3: Ejecución del Detector de Nepotismo en D1 ──────────────
      try {
        const { results: entidades } = await env.DB
          .prepare(`
            SELECT er.id, er.politico_id, er.nombre_relacionado, p.nombre_completo
            FROM entidades_relacionadas er
            JOIN politicos p ON p.id = er.politico_id
            WHERE er.alerta_nepotismo = 0
            LIMIT 200
          `)
          .all<{ id: string; politico_id: string; nombre_relacionado: string; nombre_completo: string }>();

        if (entidades && entidades.length > 0) {
          for (const ent of entidades) {
            const resNep = detectarNepotismo(
              { nombre_completo: ent.nombre_completo },
              { nombre_completo: ent.nombre_relacionado }
            );

            if (resNep.coincide) {
              summary.alertas_nepotismo_detectadas++;
              const nivelAlertaNum = resNep.nivel === "critico" ? 2 : 1;

              await env.DB
                .prepare(`UPDATE entidades_relacionadas SET alerta_nepotismo = ? WHERE id = ?`)
                .bind(nivelAlertaNum, ent.id)
                .run();

              await env.DB
                .prepare(`
                  INSERT OR IGNORE INTO alertas_anomalias (id, politico_id, fecha, tipo_alerta, nivel_gravedad, descripcion)
                  VALUES (?, ?, date('now'), 'Nepotismo', ?, ?)
                `)
                .bind(
                  `alerta-nep-${ent.id}`,
                  ent.politico_id,
                  resNep.nivel === "critico" ? "Critica" : "Alta",
                  resNep.descripcion
                )
                .run();

              if (resNep.nivel === "critico") {
                summary.alertas_criticas_disparadas++;
              }
            }
          }
        }
      } catch (err) {
        summary.errores.push(`D1 Nepotism Detector: ${String(err)}`);
      }

// ─── PASO 4: Recálculo de Scores de Probidad (SIN datos inventados) ──
      // Antes: calculaba asistencia con Math.random() y persistía scores y
      // historial_scores fabricados a D1 cada noche. REGLA: un score solo se
      // publica si proviene de fuentes reales (asistencia Congreso OpenData,
      // gastos opendata.congreso.cl, DIP). Sin fuente real → no se escribe nada:
      // la tabla scores_probidad permanece vacía y el frontend muestra
      // "Sin datos verificados" (lib/scores.ts mantiene SCORES_SEED = []).
      // Habilitar este bloque SOLO cuando se conecten las fuentes reales:
      //
      //   const scoreCalc = calcularScoreProbidad({
      //     sesiones_asistidas: <real>, sesiones_totales: <real>,
      //     gasto_ajustado_promedio: <real>, ...});
      //   -> INSERT INTO scores_probidad ... (sólo con montos verificados)
      //
      // NOTE: los ciudadanos no reciben un score; solo se publican cifras reales con fuente.
      console.log("[ETL] Scores de probidad: sin fuente real disponible → no se persisten scores inventados.");
    }

    // ─── PASO 5: Invalidación de Cache en Cloudflare KV ────────────────────
    if (env.CACHE) {
      try {
        const cacheKeys = ["home:kpis", "home:cambiometro", "rankings:scores", "partidos:stats", "movimientos:list"];
        await Promise.all(cacheKeys.map((k) => env.CACHE.delete(k)));
        console.log(`[ETL] Cache KV invalidado exitosamente (${cacheKeys.length} claves)`);
      } catch (err) {
        summary.errores.push(`KV Cache Invalidation: ${String(err)}`);
      }
    }

    // ─── PASO 5b: Sincronización de Movimientos de Autoridades en D1 ──────
    if (env.DB) {
      try {
        await env.DB
          .prepare(`
            CREATE TABLE IF NOT EXISTS movimientos (
              id TEXT PRIMARY KEY,
              fecha TEXT,
              fecha_exacta INTEGER,
              tipo TEXT,
              organo TEXT,
              cargo TEXT,
              saliente TEXT,
              entrante TEXT,
              motivo TEXT,
              fuente TEXT,
              verificado INTEGER,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
          `)
          .run();

        for (const mov of MOVIMIENTOS) {
          await env.DB
            .prepare(`
              INSERT INTO movimientos (id, fecha, fecha_exacta, tipo, organo, cargo, saliente, entrante, motivo, fuente, verificado)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                fecha = excluded.fecha,
                tipo = excluded.tipo,
                organo = excluded.organo,
                cargo = excluded.cargo,
                saliente = excluded.saliente,
                entrante = excluded.entrante,
                motivo = excluded.motivo,
                fuente = excluded.fuente,
                verificado = excluded.verificado,
                updated_at = CURRENT_TIMESTAMP
            `)
            .bind(
              mov.id,
              mov.fecha,
              mov.fechaExacta ? 1 : 0,
              mov.tipo,
              mov.organo,
              mov.cargo,
              mov.saliente ?? null,
              mov.entrante ?? null,
              mov.motivo,
              mov.fuente ?? null,
              mov.verificado ? 1 : 0
            )
            .run();
        }

        console.log(`[ETL] Movimientos de autoridades sincronizados: ${MOVIMIENTOS.length} registros`);
      } catch (err) {
        summary.errores.push(`D1 Movimientos Sync: ${String(err)}`);
      }
    }

    // ─── PASO 6: Registro Auditado en Cloudflare R2 ────────────────────────
    summary.duracion_ms = Date.now() - startTime;
    if (env.R2_BUCKET) {
      try {
        const dateKey = new Date().toISOString().split("T")[0];
        await env.R2_BUCKET.put(
          `logs/etl/${dateKey}.json`,
          JSON.stringify(summary, null, 2),
          { httpMetadata: { contentType: "application/json" } }
        );
      } catch (err) {
        summary.errores.push(`R2 Audit Log: ${String(err)}`);
      }
    }

    // ─── PASO 7: Difusión de Notificaciones Telegram/Discord ───────────────
    if (env.TELEGRAM_BOT_TOKEN && summary.alertas_criticas_disparadas > 0) {
      ctx.waitUntil(
        enviarTelegramBroadCast(
          env.TELEGRAM_BOT_TOKEN,
          `🚨 *ETL El Cambiómetro (00:01 CLT)*\n\nSe procesaron ${summary.autoridades_procesadas} autoridades.\nAlertas críticas disparadas: *${summary.alertas_criticas_disparadas}*\nDuración: ${summary.duracion_ms}ms`
        )
      );
    }

    console.log(`[ETL 00:01 AM CLT] Finalizado con éxito en ${summary.duracion_ms}ms. Procesadas: ${summary.autoridades_procesadas} autoridades.`);
  },
};

export default worker;

async function enviarTelegramBroadCast(botToken: string, mensaje: string) {
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: "@transparencia_chile",
        text: mensaje,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("[ETL] Telegram broadcast error:", err);
  }
}
