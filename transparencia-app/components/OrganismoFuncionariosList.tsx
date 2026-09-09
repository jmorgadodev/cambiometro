"use client";

import { useState, useEffect, useRef } from "react";
import type { FuncionarioPublico } from "@/lib/funcionarios";
import {
  formatEstamentoCorto,
  formatTipoContrato,
  getInitials,
} from "@/lib/estamentos-format";
import { classifyFuncionarioRecord, type AnomaliaInfo } from "@/lib/funcionarios-quality";
import { queryStaticFuncionarios } from "@/lib/funcionarios-static";
import { normalizeFuncionarioRecord, type FuncionarioQualityFilter } from "@/lib/funcionarios-normalization";
import FuncionarioDetailDialog, { type FuncionarioDetailRecord } from "@/components/municipalidades/FuncionarioDetailDialog";
import { buildFuncionarioSalaryHistory } from "@/lib/funcionarios-history";

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n);
}

interface OrganismoFuncionariosListProps {
  organismoId: string;
  nombreOrganismo: string;
  periodo?: string | null;
  periodoEtiqueta?: string | null;
}

interface SinPagoItem {
  id: string;
  nombre_completo: string;
  cargo: string;
  tipo_contrato: string;
  estamento: string;
  fuente_periodo: string;
  observaciones: string;
}

interface AnomaliaItem {
  id: string;
  nombre_completo: string;
  cargo: string;
  tipo_contrato: string;
  estamento: string;
  remuneracion_bruta_mensual: number;
  remuneracion_liquida_mensual: number;
  fuente_periodo: string;
  observaciones: string;
  causaId: string;
  etiquetaCausa: string;
  explicacionCiudadana: string;
  nivelConfianza: string;
  urlRegistroOriginal: string;
}

export default function OrganismoFuncionariosList({
  organismoId,
  nombreOrganismo,
  periodo,
  periodoEtiqueta,
}: OrganismoFuncionariosListProps) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("Todos");
  const [contratoFilter, setContratoFilter] = useState("Todos");
  const [qualityFilter, setQualityFilter] = useState<FuncionarioQualityFilter>("Todos");
  const [sortBy, setSortBy] = useState("sueldo_desc");
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  const [data, setData] = useState<FuncionarioPublico[]>([]);
  const [total, setTotal] = useState(0);
  const [totalHeadcount, setTotalHeadcount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sourceStatus, setSourceStatus] = useState<"api" | "static" | "static-fallback" | "unavailable">("api");
  const [historicalSearchPeriod, setHistoricalSearchPeriod] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [selectedFuncionario, setSelectedFuncionario] = useState<FuncionarioPublico | null>(null);
  const [staticRecords, setStaticRecords] = useState<FuncionarioPublico[]>([]);
  const [payrollCoverage, setPayrollCoverage] = useState<{ expected: number; available: number } | null>(null);
  const staticRecordsCacheRef = useRef<{ organismoId: string; records: FuncionarioPublico[] } | null>(null);

  // Calidad de datos forense (Sección 1 y 2)
  const [observadosCount, setObservadosCount] = useState(0);
  const [sinPagoCount, setSinPagoCount] = useState(0);
  const [microMontoCount, setMicroMontoCount] = useState(0);
  const [sueldoCompletoCount, setSueldoCompletoCount] = useState(0);
  const [causasBreakdown, setCausasBreakdown] = useState<Record<string, number>>({});
  const [anomaliasList, setAnomaliasList] = useState<AnomaliaItem[]>([]);
  const [sinPagoList, setSinPagoList] = useState<SinPagoItem[]>([]);
  const [showSinPagoExpander, setShowSinPagoExpander] = useState(false);
  const [showAnomaliasSection, setShowAnomaliasSection] = useState(true);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // Fetch data
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function fetchJson(url: string, timeoutMs: number) {
      const requestController = new AbortController();
      const onLifetimeAbort = () => requestController.abort();
      controller.signal.addEventListener("abort", onLifetimeAbort, { once: true });
      const timer = window.setTimeout(() => requestController.abort(), timeoutMs);
      try {
        const response = await fetch(url, { signal: requestController.signal, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      } finally {
        window.clearTimeout(timer);
        controller.signal.removeEventListener("abort", onLifetimeAbort);
      }
    }

    async function fetchData() {
      setIsLoading(true);
      setErrorMessage(null);
      setSourceStatus("api");
      setHistoricalSearchPeriod(null);
      setStaticRecords([]);
      if (staticRecordsCacheRef.current?.organismoId !== organismoId) staticRecordsCacheRef.current = null;
      try {
        const params = new URLSearchParams({
          query: debouncedSearch,
          muni: organismoId,
          contrato: contratoFilter,
          calidad: qualityFilter,
          estamento: deptFilter !== "Todos" ? deptFilter : "Todos",
          sortBy,
          page: page.toString(),
          limit: itemsPerPage.toString(),
        });
        if (periodo && periodo !== "Todos") {
          params.set("periodo", periodo);
        }
        const staticManifest = await fetchJson("/data/funcionarios/manifest.json", 3_000).catch(() => null);
        if (active && staticManifest) {
          const expected = Number(staticManifest.expectedMunicipalities ?? 0);
          const available = Number(staticManifest.availableMunicipalities ?? 0);
          if (expected > 0) setPayrollCoverage({ expected, available });
        }
        const staticEntry = staticManifest?.files?.find?.((entry: { id?: string; rows?: number; chunks?: Array<{ path?: string }> }) => entry.id === organismoId && Number(entry.rows) > 0);
        const unavailableEntry = staticManifest?.unavailableMunicipalities?.find?.((entry: { id?: string; status?: string; recordCount?: number }) => entry.id === organismoId);
        const readStatic = async () => {
          const cached = staticRecordsCacheRef.current;
          if (cached?.organismoId === organismoId) {
            setStaticRecords(cached.records);
            return queryStaticFuncionarios(cached.records, {
              query: debouncedSearch,
              contrato: contratoFilter,
              calidad: qualityFilter,
              estamento: deptFilter,
              sortBy,
              periodo: periodo ?? undefined,
              page,
              limit: itemsPerPage,
            });
          }
          const chunkPaths = Array.isArray(staticEntry?.chunks)
            ? staticEntry.chunks.map((chunk: { path?: string }) => chunk.path).filter((path: unknown): path is string => typeof path === "string" && path.length > 0)
            : [];
          const paths = chunkPaths.length > 0
            ? chunkPaths
            : [`/data/funcionarios/${encodeURIComponent(organismoId)}.json`];
          const payloads = await Promise.all(paths.map((path: string) => fetchJson(path, 8_000)));
          const staticResponse = payloads.flat();
          if (!payloads.every(Array.isArray)) throw new Error("STATIC_PAYROLL_INVALID");
          const normalizedStaticRecords = staticResponse.map((item: FuncionarioPublico) => normalizeFuncionarioRecord(item));
          staticRecordsCacheRef.current = { organismoId, records: normalizedStaticRecords };
          setStaticRecords(normalizedStaticRecords);
          return queryStaticFuncionarios(normalizedStaticRecords, {
            query: debouncedSearch,
            contrato: contratoFilter,
            calidad: qualityFilter,
            estamento: deptFilter,
            sortBy,
            periodo: periodo ?? undefined,
            page,
            limit: itemsPerPage,
          });
        };
        let result;
        let matchedHistoricalPeriod: string | null = null;
        if (staticEntry) {
          try {
            result = await readStatic();
            // La vista normal respeta el corte seleccionado. Si una búsqueda
            // nominal no aparece allí, revisamos el catálogo histórico ya
            // publicado para no confundir "no está en este mes" con
            // "nunca fue publicado".
            if (debouncedSearch.trim() && periodo && periodo !== "Todos" && result.meta?.total === 0) {
              const historicalResult = await queryStaticFuncionarios(staticRecordsCacheRef.current?.records ?? [], {
                query: debouncedSearch,
                contrato: contratoFilter,
                calidad: qualityFilter,
                estamento: deptFilter,
                sortBy,
                periodo: "Todos",
                page,
                limit: itemsPerPage,
              });
              if (historicalResult.meta.total > 0) {
                result = historicalResult;
                const periods = [...new Set(historicalResult.data.map((item) => item.fuente_periodo || item.periodo).filter(Boolean))];
                matchedHistoricalPeriod = periods.join(", ") || "un período anterior";
              }
            }
            if (active) setSourceStatus("static");
          } catch {
            result = await fetchJson(`/api/funcionarios?${params.toString()}`, 3_000);
            if (debouncedSearch.trim() && periodo && periodo !== "Todos" && result.meta?.total === 0) {
              const historicalParams = new URLSearchParams(params);
              historicalParams.delete("periodo");
              const historicalResult = await fetchJson(`/api/funcionarios?${historicalParams.toString()}`, 3_000);
              if (historicalResult.meta?.total > 0) {
                result = historicalResult;
                const periods = [...new Set((historicalResult.data ?? []).map((item: FuncionarioPublico) => item.fuente_periodo || item.periodo).filter(Boolean))];
                matchedHistoricalPeriod = periods.join(", ") || "un período anterior";
              }
            }
            if (active) setSourceStatus("api");
          }
        } else {
          try {
            result = await fetchJson(`/api/funcionarios?${params.toString()}`, 3_000);
            if (debouncedSearch.trim() && periodo && periodo !== "Todos" && result.meta?.total === 0) {
              const historicalParams = new URLSearchParams(params);
              historicalParams.delete("periodo");
              const historicalResult = await fetchJson(`/api/funcionarios?${historicalParams.toString()}`, 3_000);
              if (historicalResult.meta?.total > 0) {
                result = historicalResult;
                const periods = [...new Set((historicalResult.data ?? []).map((item: FuncionarioPublico) => item.fuente_periodo || item.periodo).filter(Boolean))];
                matchedHistoricalPeriod = periods.join(", ") || "un período anterior";
              }
            }
          } catch {
            if (unavailableEntry) throw new Error("STATIC_PAYROLL_NOT_PUBLISHED");
            result = await readStatic();
            if (debouncedSearch.trim() && periodo && periodo !== "Todos" && result.meta?.total === 0) {
              const historicalResult = await queryStaticFuncionarios(staticRecordsCacheRef.current?.records ?? [], {
                query: debouncedSearch,
                contrato: contratoFilter,
                calidad: qualityFilter,
                estamento: deptFilter,
                sortBy,
                periodo: "Todos",
                page,
                limit: itemsPerPage,
              });
              if (historicalResult.meta.total > 0) {
                result = historicalResult;
                const periods = [...new Set(historicalResult.data.map((item) => item.fuente_periodo || item.periodo).filter(Boolean))];
                matchedHistoricalPeriod = periods.join(", ") || "un período anterior";
              }
            }
            if (active) setSourceStatus("static-fallback");
          }
        }
        if (!active) return;
        setData((result.data ?? []).map((item: FuncionarioPublico) => normalizeFuncionarioRecord(item)));
        setTotal(result.meta?.total ?? 0);
        setTotalHeadcount(result.meta?.totalHeadcount || result.meta?.stats?.totalMuni || result.meta?.total || 0);
        setTotalPages(result.meta?.totalPages ?? 1);
        setObservadosCount(result.meta?.observadosCount || result.meta?.stats?.observadosCount || 0);
        setSinPagoCount(result.meta?.sinPagoCount || result.meta?.stats?.sinPagoCount || 0);
        setMicroMontoCount(result.meta?.microMontoCount || result.meta?.stats?.microMontoCount || 0);
        setSueldoCompletoCount(result.meta?.sueldoCompletoCount || result.meta?.stats?.totalValidos || 0);
        setCausasBreakdown(result.meta?.causasBreakdown || {});
        setAnomaliasList(result.meta?.anomaliasSample || []);
        setSinPagoList(result.meta?.sinPagoSample || []);
        setHistoricalSearchPeriod(matchedHistoricalPeriod);
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        setData([]);
        setTotal(0);
        setTotalHeadcount(0);
        setTotalPages(1);
        setObservadosCount(0);
        setSinPagoCount(0);
        setMicroMontoCount(0);
        setSueldoCompletoCount(0);
        setCausasBreakdown({});
        setAnomaliasList([]);
        setSinPagoList([]);
        setSourceStatus("unavailable");
        setErrorMessage(error instanceof Error && error.message === "STATIC_PAYROLL_INVALID"
          ? "La proyección local de esta municipalidad no tiene un formato oficial válido."
          : error instanceof Error && error.message === "STATIC_PAYROLL_NOT_PUBLISHED"
            ? "La fuente oficial reportó esta municipalidad, pero no publicó registros de nómina para el corte disponible."
            : "La nómina oficial no está disponible temporalmente.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    fetchData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [debouncedSearch, organismoId, contratoFilter, qualityFilter, deptFilter, sortBy, page, periodo, retryNonce]);

  // Construcción del texto de causas para la Caja Ciudadana (§2.3)
  const visibleQualityCount = data.filter((item) => (item.calidad_datos?.incidencias.length ?? 0) > 0).length;
  const causasTexto = [
    causasBreakdown.ajuste_periodo_anterior ? `${causasBreakdown.ajuste_periodo_anterior} por ajustes/rectificaciones de meses previos` : null,
    causasBreakdown.asignacion_reembolso_menor ? `${causasBreakdown.asignacion_reembolso_menor} por viáticos o movilización puntual` : null,
    causasBreakdown.prorrateo_dias_horas ? `${causasBreakdown.prorrateo_dias_horas} por prorrateo de días trabajados` : null,
    causasBreakdown.error_unidad_fuente ? `${causasBreakdown.error_unidad_fuente} por valores nominales residuales de origen` : null,
    causasBreakdown.anomalia_fuente ? `${causasBreakdown.anomalia_fuente} sin causa determinable en observaciones ('anomalía de la fuente')` : null,
  ].filter(Boolean).join(", ") || "clasificación forense en curso";

  const selectedFuncionarioDetail: FuncionarioDetailRecord | null = selectedFuncionario
    ? (() => {
        const overtimeAmount = selectedFuncionario.monto_horas_extras_clp > 0
          ? selectedFuncionario.monto_horas_extras_clp
          : null;
        const overtimeHours = selectedFuncionario.horas_extras_mes_anterior > 0
          ? selectedFuncionario.horas_extras_mes_anterior
          : [
              selectedFuncionario.horas_extras_diurnas_hrs,
              selectedFuncionario.horas_extras_nocturnas_hrs,
              selectedFuncionario.horas_extras_festivas_hrs,
            ].reduce<number>((sum, value) => sum + (value ?? 0), 0);
        const gross = selectedFuncionario.remuneracion_bruta_mensual || null;
        const base = gross !== null && overtimeAmount !== null && gross >= overtimeAmount
          ? gross - overtimeAmount
          : null;
        return {
          id: selectedFuncionario.id,
          nombre: selectedFuncionario.nombre_completo,
          cargo: selectedFuncionario.cargo,
          estamento: selectedFuncionario.estamento,
          tipoContrato: selectedFuncionario.tipo_contrato,
          periodo: selectedFuncionario.periodo,
          sueldoBase: base,
          remuneracionBruta: gross,
          remuneracionLiquida: selectedFuncionario.remuneracion_liquida_mensual,
          horasExtras: overtimeHours,
          montoHorasExtras: overtimeAmount,
          horasExtrasDiurnas: selectedFuncionario.horas_extras_diurnas_hrs,
          horasExtrasNocturnas: selectedFuncionario.horas_extras_nocturnas_hrs,
          horasExtrasFestivas: selectedFuncionario.horas_extras_festivas_hrs,
          grado: selectedFuncionario.grado_eus,
          formacion: selectedFuncionario.formacion,
          region: selectedFuncionario.region,
          fechaIngreso: selectedFuncionario.fecha_ingreso,
          fechaTermino: selectedFuncionario.fecha_termino,
          asignacionesEspeciales: selectedFuncionario.asignaciones_especiales_clp,
          remuneracionesAdicionales: selectedFuncionario.rem_adicionales_clp,
          bonosIncentivos: selectedFuncionario.bonos_incentivos_clp,
          viaticos: selectedFuncionario.viaticos_clp,
          derechoHorasExtras: selectedFuncionario.derecho_horas_extras,
          observaciones: selectedFuncionario.observaciones,
          fuente: selectedFuncionario.fuente,
          fuentePeriodo: selectedFuncionario.fuente_periodo,
          calidad: selectedFuncionario.calidad_datos?.estado,
          calidadDetalle: selectedFuncionario.calidad_datos?.detalle,
          historial: buildFuncionarioSalaryHistory(staticRecords, selectedFuncionario.nombre_completo),
        };
      })()
    : null;

  return (
    <div>
      {/* ═══ SECCIÓN 2.1: ANOMALÍAS Y PAGOS PARCIALES (PERMANENTE) ═══ */}
      {microMontoCount > 0 && (
        <div
          className="card"
          style={{
            marginBottom: "1.75rem",
            padding: "1.35rem",
            borderLeft: "4px solid var(--warn)",
            background: "var(--bg-surface)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.25rem" }}>⚠️</span>
              <h3 style={{ margin: 0, fontSize: "1.05rem", color: "var(--text-primary)", fontWeight: 800 }}>
                Anomalías y pagos parciales ({microMontoCount.toLocaleString("es-CL")})
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowAnomaliasSection(!showAnomaliasSection)}
              className="btn btn-secondary"
              style={{ fontSize: "0.76rem", padding: "0.3rem 0.75rem", borderRadius: 6 }}
            >
              {showAnomaliasSection ? "▲ Ocultar desglose" : `▼ Ver detalle (${microMontoCount})`}
            </button>
          </div>

          {/* Caja Ciudadana §2.3 */}
          <div
            style={{
              marginTop: "0.85rem",
              padding: "0.85rem 1rem",
              background: "var(--warn-bg)",
              border: "1px solid var(--warn)",
              borderRadius: 8,
              fontSize: "0.78rem",
              lineHeight: 1.55,
              color: "var(--text-primary)",
            }}
          >
            <strong style={{ color: "var(--warn)", display: "block", marginBottom: "0.25rem" }}>
              💡 ¿Por qué hay montos de $52 a $80 en la nómina oficial?
            </strong>
            Estos montos vienen así desde Transparencia Activa. No los borramos ni corregimos: los mostramos tal cual y los separamos de los sueldos mensuales para no distorsionar totales. Un monto de $80 no es un sueldo mensual ni una boleta válida; tras revisar la fuente, las causas detectadas son: <strong>{causasTexto}</strong>. Los registros sin causa confirmada quedan como <em>&ldquo;anomalía de la fuente&rdquo;</em> y puedes verificarlos en el portal oficial.
          </div>

          {/* Cards de Anomalías §2.2 */}
          {showAnomaliasSection && anomaliasList.length > 0 && (
            <div style={{ marginTop: "1rem" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", fontWeight: 700, textTransform: "uppercase", marginBottom: "0.6rem" }}>
                Muestra de registros anómalos clasificados con evidencia ({anomaliasList.length} de {microMontoCount})
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))", gap: "0.75rem" }}>
                {anomaliasList.slice(0, 8).map((anom) => (
                  <div
                    key={anom.id}
                    style={{
                      padding: "0.85rem",
                      background: "var(--bg-surface-2)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: 8,
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.4rem" }}>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-primary)" }}>
                          {anom.nombre_completo}
                        </div>
                        <strong style={{ fontFamily: "monospace", color: "var(--warn)", fontSize: "0.95rem" }}>
                          {formatCLP(anom.remuneracion_bruta_mensual)}
                        </strong>
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "0.15rem" }}>
                        {anom.cargo} · <span style={{ fontFamily: "monospace" }}>{anom.tipo_contrato}</span>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                        <span className="badge badge-warn" style={{ fontSize: "0.65rem", padding: "0.15rem 0.4rem" }}>
                          ⚠️ {anom.etiquetaCausa}
                        </span>
                        <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)" }}>
                          ({anom.nivelConfianza})
                        </span>
                      </div>
                      <p style={{ margin: "0 0 0.4rem", fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                        {anom.explicacionCiudadana}
                      </p>
                      <a
                        href={anom.urlRegistroOriginal}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--accent)",
                          textDecoration: "none",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.2rem",
                        }}
                      >
                        Ver registro original en Transparencia Activa ↗
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="card-flat" style={{ marginBottom: "1.5rem" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "0.85rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>
              Buscar por nombre o cargo
            </label>
            <input
              type="text"
              className="input"
              placeholder="🔍 Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>
              Tipo de contrato
            </label>
            <select
              className="input"
              value={contratoFilter}
              onChange={(e) => { setContratoFilter(e.target.value); setPage(1); }}
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
            >
              <option value="Todos">Todos los contratos</option>
              <option value="Planta">Planta</option>
              <option value="Contrata">Contrata</option>
              <option value="Honorarios">Honorarios</option>
              <option value="CodigoTrabajo">Código del Trabajo</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>
              Estamento
            </label>
            <select
              className="input"
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
            >
              <option value="Todos">Todos los estamentos</option>
              <option value="Directivo">Directivo / Jefatura</option>
              <option value="Profesional">Profesional</option>
              <option value="Tecnico">Técnico</option>
              <option value="Administrativo">Administrativo</option>
              <option value="Auxiliar">Auxiliar</option>
              <option value="Salud">Salud y Médicos</option>
            </select>
          </div>

          <div>
            <label
              style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}
              title="Clasificación de auditoría: no elimina ni reemplaza el valor informado por la fuente."
            >
              Calidad de la fuente
            </label>
            <select
              className="input"
              value={qualityFilter}
              onChange={(e) => { setQualityFilter(e.target.value as FuncionarioQualityFilter); setPage(1); }}
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
            >
              <option value="Todos">Todos los registros</option>
              <option value="corregidos">Correcciones de formato</option>
              <option value="observados">Datos observados por auditoría</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontWeight: 700, display: "block", marginBottom: "0.3rem" }}>
              Ordenar por
            </label>
            <select
              className="input"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              style={{ width: "100%", fontSize: "0.85rem", padding: "0.45rem 0.75rem" }}
            >
              <option value="sueldo_desc">Sueldo: Mayor a menor</option>
              <option value="sueldo_asc">Sueldo: Menor a mayor (positivo)</option>
              <option value="horas_extras_desc">Horas extras: Mayor a menor</option>
              <option value="nombre_asc">Nombre: A - Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contador & Balance de Dotación Total §5 A1 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem", fontSize: "0.82rem", color: "var(--text-muted)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <span>
            Mostrando <strong>{total.toLocaleString("es-CL")}</strong> funcionarios navegables{" "}
            {totalHeadcount > 0 ? (
              <span style={{ color: "var(--text-subtle)" }}>
                (Dotación total: {totalHeadcount.toLocaleString("es-CL")} = {sueldoCompletoCount.toLocaleString("es-CL")} sueldos regulares + {microMontoCount.toLocaleString("es-CL")} anomalías + {sinPagoCount.toLocaleString("es-CL")} sin pago)
              </span>
            ) : ""}
          </span>

          {observadosCount > 0 && (
            <span
              className="badge badge-warn"
              style={{ fontSize: "0.72rem", padding: "0.2rem 0.55rem", fontWeight: 700 }}
              title="Registros excluidos de tops y promedios por ser pagos parciales, ajustes puntuales o licencias sin goce de sueldo."
            >
              ⚠️ {observadosCount.toLocaleString("es-CL")} registros observados por calidad de dato
            </span>
          )}
        </div>

        {totalPages > 1 && <span>Página {page} de {totalPages}</span>}
      </div>
      {sourceStatus === "static-fallback" && (
        <div className="card-flat" role="status" style={{ marginBottom: "1rem", padding: "0.75rem 1rem", fontSize: "0.78rem", color: "var(--text-muted)" }}>
          El Worker API no respondió; se está mostrando la última proyección oficial estática disponible para esta municipalidad.
        </div>
      )}
      {sourceStatus === "static" && (
        <div role="status" style={{ marginBottom: "1rem", fontSize: "0.74rem", color: "var(--text-subtle)" }}>
          Fuente: proyección oficial estática generada en el último build.
        </div>
      )}
      {historicalSearchPeriod && (
        <div role="note" className="card-flat" style={{ marginBottom: "1rem", padding: "0.8rem 1rem", fontSize: "0.78rem", lineHeight: 1.5, color: "var(--text-muted)" }}>
          No apareció en el corte seleccionado ({periodoEtiqueta || periodo}), pero sí existe en la nómina histórica publicada. Coincidencia encontrada en: <strong style={{ color: "var(--text-primary)" }}>{historicalSearchPeriod}</strong>. Puedes cambiar el período para revisar el contexto completo.
        </div>
      )}
      {payrollCoverage && payrollCoverage.available < payrollCoverage.expected && (
        <div className="card-flat" role="note" style={{ marginBottom: "1rem", padding: "0.8rem 1rem", fontSize: "0.78rem", lineHeight: 1.5, color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text-primary)" }}>Cobertura real de nóminas:</strong>{" "}
          el release actual publica registros para {payrollCoverage.available.toLocaleString("es-CL")} de {payrollCoverage.expected.toLocaleString("es-CL")} comunas. Las comunas sin nómina publicada se mantienen como “sin datos publicados”; no se muestran como $0 ni se completan con estimaciones.
        </div>
      )}
      {visibleQualityCount > 0 && (
        <div
          role="note"
          className="card-flat"
          style={{ marginBottom: "1rem", padding: "0.8rem 1rem", fontSize: "0.78rem", lineHeight: 1.5, color: "var(--text-muted)" }}
        >
          <strong style={{ color: "var(--text-primary)" }}>Depuración visible de la fuente:</strong>{" "}
          {visibleQualityCount.toLocaleString("es-CL")} registros de esta página tienen una incidencia de formato reportada por el organismo. Se corrigen sólo prefijos o espacios inequívocos para facilitar la lectura; conservamos el valor original y el enlace a la fuente. No inferimos nombres ni remuneraciones.
        </div>
      )}

      {/* Grilla Principal */}
      {isLoading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          Cargando nómina oficial...
        </div>
      ) : errorMessage ? (
        <div className="card" role="status" style={{ textAlign: "center", padding: "2.5rem" }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Nómina no disponible</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{errorMessage}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setRetryNonce((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      ) : data.length === 0 ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          No se encontraron funcionarios que coincidan con la búsqueda.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "1rem" }}>
          {data.map((func) => {
            const estamentoStyle = formatEstamentoCorto(func.estamento);
            const contratoStyle = formatTipoContrato(func.tipo_contrato);
            const initials = getInitials(func.nombre_completo);
            const bruto = func.remuneracion_bruta_mensual || 0;
            const qualityInfo = classifyFuncionarioRecord(func);

            return (
              <div
                key={func.id}
                className="municipal-staff-card"
                role="button"
                tabIndex={0}
                aria-label={`Abrir expediente de ${func.nombre_completo}`}
                onClick={() => setSelectedFuncionario(func)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setSelectedFuncionario(func);
                  }
                }}
                style={{
                  background: "var(--bg-surface)",
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  padding: "1.15rem",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "0.75rem",
                }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background: estamentoStyle.bg,
                      border: `1.5px solid ${estamentoStyle.border}`,
                      color: estamentoStyle.text,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: "0.85rem",
                      flexShrink: 0,
                    }}
                  >
                    {initials}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.25, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {func.nombre_completo}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "0.15rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {func.cargo || "Sin cargo"}
                    </div>
                    {(func.calidad_datos?.incidencias.length ?? 0) > 0 && (
                      <span
                        className="badge badge-warn"
                        style={{ display: "inline-flex", marginTop: "0.35rem", fontSize: "0.62rem", padding: "0.12rem 0.4rem" }}
                        title={func.calidad_datos?.detalle}
                      >
                        Fuente normalizada
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", alignItems: "center" }}>
                  <span
                    style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: 4,
                      background: estamentoStyle.bg,
                      color: estamentoStyle.text,
                      border: `1px solid ${estamentoStyle.border}`,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                    }}
                    title={`Estamento oficial: ${estamentoStyle.original}`}
                  >
                    {estamentoStyle.label}
                  </span>
                  <span
                    style={{
                      padding: "0.15rem 0.5rem",
                      borderRadius: 4,
                      background: contratoStyle.bg,
                      color: contratoStyle.text,
                      border: `1px solid ${contratoStyle.border}`,
                      fontSize: "0.68rem",
                      fontWeight: 600,
                    }}
                  >
                    {contratoStyle.label}
                  </span>

                  {/* Badges de Calidad §2.4 */}
                  {qualityInfo.isSueldoCompleto && (
                    <span
                      className="badge badge-ok"
                      style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem" }}
                      title="Remuneración mensual completa regular"
                    >
                      ✓ Sueldo mensual completo
                    </span>
                  )}

                  {qualityInfo.isMicroMonto && (
                    <span
                      className="badge badge-warn"
                      style={{ fontSize: "0.65rem", padding: "0.15rem 0.45rem", cursor: "help" }}
                      title={`${qualityInfo.etiquetaCausa}: ${qualityInfo.explicacionCiudadana}`}
                    >
                      ⚠️ {qualityInfo.etiquetaCausa}
                    </span>
                  )}
                </div>

                <div style={{ paddingTop: "0.5rem", borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <span style={{ fontSize: "0.65rem", color: "var(--text-subtle)", display: "block" }}>
                      {qualityInfo.isSinPago ? "Estado de Remuneración" : "Sueldo Bruto"}
                    </span>
                    {qualityInfo.isSinPago ? (
                      <span className="badge badge-subtle" style={{ fontSize: "0.75rem", fontWeight: 700 }}>
                        Sin pago registrado
                      </span>
                    ) : (
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                        <strong style={{ fontFamily: "monospace", fontWeight: 800, color: qualityInfo.isMicroMonto ? "var(--warn)" : "var(--ok)", fontSize: "1.05rem" }}>
                          {formatCLP(bruto)}
                        </strong>
                        {qualityInfo.isMicroMonto && (
                          <a
                            href={qualityInfo.urlRegistroOriginal}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(event) => event.stopPropagation()}
                            style={{ fontSize: "0.65rem", color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}
                            title="Ver fila original en portal oficial de Transparencia"
                          >
                            Ver fuente ↗
                          </a>
                        )}
                      </div>
                    )}
                    {func.remuneracion_liquida_mensual == null && bruto > 0 && (
                      <div
                        style={{ marginTop: "0.35rem", fontSize: "0.7rem", color: "var(--text-subtle)" }}
                        title={func.remuneracion_liquida_mensual_original == null
                          ? "La fuente no publicó un sueldo líquido para este registro."
                          : `La fuente informó ${formatCLP(func.remuneracion_liquida_mensual_original)}; se muestra como no informado para no presentarlo como pago real.`}
                      >
                        Sueldo líquido: <strong>No informado por la fuente</strong>
                      </div>
                    )}
                    {func.remuneracion_liquida_mensual != null && (
                      <div style={{ marginTop: "0.35rem", fontSize: "0.7rem", color: "var(--text-subtle)" }}>
                        Sueldo líquido: <strong>{formatCLP(func.remuneracion_liquida_mensual)}</strong>
                      </div>
                    )}
                  </div>
                  {/* §4: Horas extras unificadas */}
                  {func.horas_extras_mes_anterior > 0 && (
                    <span style={{ padding: "0.15rem 0.45rem", borderRadius: 4, background: "var(--warn-bg)", color: "var(--warn)", border: "1px solid var(--warn)", fontSize: "0.7rem", fontWeight: 700 }}>
                      +{func.horas_extras_mes_anterior} hrs extras
                    </span>
                  )}
                </div>

                <div style={{ color: "var(--accent)", fontSize: "0.72rem", fontWeight: 700 }}>
                  Ver expediente completo →
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", opacity: page === 1 ? 0.5 : 1 }}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: "0.8rem", alignSelf: "center", color: "var(--text-muted)" }}>
            {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary"
            style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", opacity: page === totalPages ? 0.5 : 1 }}
          >
            Siguiente →
          </button>
        </div>
      )}

      {/* D1: Nota al pie y Colapsable de Registros sin Pago */}
      {sinPagoCount > 0 && (
        <div
          style={{
            marginTop: "1.75rem",
            padding: "1rem 1.25rem",
            background: "var(--bg-surface-2)",
            borderRadius: 8,
            border: "1px solid var(--border)",
            fontSize: "0.8rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div style={{ color: "var(--text-muted)" }}>
              📌 <strong>{sinPagoCount.toLocaleString("es-CL")} registros sin pago en el período</strong> (ex funcionarios, licencias sin goce u observaciones de la fuente).
            </div>
            <button
              type="button"
              onClick={() => setShowSinPagoExpander(!showSinPagoExpander)}
              className="btn btn-secondary"
              style={{ fontSize: "0.74rem", padding: "0.25rem 0.65rem", borderRadius: 6 }}
            >
              {showSinPagoExpander ? "▲ Ocultar lista" : `▼ Ver lista (${sinPagoCount})`}
            </button>
          </div>

          {showSinPagoExpander && sinPagoList.length > 0 && (
            <div style={{ marginTop: "0.85rem", paddingTop: "0.75rem", borderTop: "1px dashed var(--border)" }}>
              <div style={{ fontSize: "0.72rem", color: "var(--text-subtle)", marginBottom: "0.5rem", fontWeight: 700, textTransform: "uppercase" }}>
                Registros sin remuneración en la nómina oficial ({sinPagoList.length} de {sinPagoCount})
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", maxHeight: "280px", overflowY: "auto" }}>
                {sinPagoList.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.45rem 0.65rem",
                      background: "var(--surface)",
                      borderRadius: 6,
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.74rem",
                      gap: "0.5rem",
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--text-primary)" }}>{item.nombre_completo}</strong>
                      <span style={{ color: "var(--text-muted)", marginLeft: "0.4rem" }}>{item.cargo}</span>
                      <span style={{ color: "var(--text-subtle)", marginLeft: "0.4rem", fontFamily: "monospace" }}>({item.tipo_contrato})</span>
                    </div>
                    <span className="badge badge-subtle" style={{ fontSize: "0.65rem", whiteSpace: "nowrap" }}>
                      {item.observaciones || "Sin pago registrado"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedFuncionarioDetail && (
        <FuncionarioDetailDialog
          record={selectedFuncionarioDetail}
          nombreOrganismo={nombreOrganismo}
          onClose={() => setSelectedFuncionario(null)}
        />
      )}
    </div>
  );
}
