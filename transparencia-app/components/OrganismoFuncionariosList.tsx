"use client";

import { useState, useEffect } from "react";
import type { FuncionarioPublico } from "@/lib/funcionarios";
import {
  formatEstamentoCorto,
  formatTipoContrato,
  getInitials,
} from "@/lib/estamentos-format";
import { classifyFuncionarioRecord, type AnomaliaInfo } from "@/lib/funcionarios-quality";

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
  const [sortBy, setSortBy] = useState("sueldo_desc");
  const [page, setPage] = useState(1);
  const itemsPerPage = 24;

  const [data, setData] = useState<FuncionarioPublico[]>([]);
  const [total, setTotal] = useState(0);
  const [totalHeadcount, setTotalHeadcount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Reset page on period change
  useEffect(() => {
    setPage(1);
  }, [periodo]);

  // Fetch data
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const params = new URLSearchParams({
          query: debouncedSearch,
          muni: organismoId,
          contrato: contratoFilter,
          estamento: deptFilter !== "Todos" ? deptFilter : "Todos",
          sortBy,
          page: page.toString(),
          limit: itemsPerPage.toString(),
        });
        if (periodo && periodo !== "Todos") {
          params.set("periodo", periodo);
        }
        const res = await fetch(`/api/funcionarios?${params.toString()}`);
        if (!res.ok) throw new Error("API Error");
        const result = await res.json();
        setData(result.data);
        setTotal(result.meta.total);
        setTotalHeadcount(result.meta.totalHeadcount || result.meta.stats?.totalMuni || result.meta.total);
        setTotalPages(result.meta.totalPages);
        setObservadosCount(result.meta.observadosCount || result.meta.stats?.observadosCount || 0);
        setSinPagoCount(result.meta.sinPagoCount || result.meta.stats?.sinPagoCount || 0);
        setMicroMontoCount(result.meta.microMontoCount || result.meta.stats?.microMontoCount || 0);
        setSueldoCompletoCount(result.meta.sueldoCompletoCount || result.meta.stats?.totalValidos || 0);
        setCausasBreakdown(result.meta.causasBreakdown || {});
        setAnomaliasList(result.meta.anomaliasSample || []);
        setSinPagoList(result.meta.sinPagoSample || []);
      } catch {
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
        setErrorMessage("La nómina oficial no está disponible temporalmente.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [debouncedSearch, organismoId, contratoFilter, deptFilter, sortBy, page, periodo]);

  // Construcción del texto de causas para la Caja Ciudadana (§2.3)
  const causasTexto = [
    causasBreakdown.ajuste_periodo_anterior ? `${causasBreakdown.ajuste_periodo_anterior} por ajustes/rectificaciones de meses previos` : null,
    causasBreakdown.asignacion_reembolso_menor ? `${causasBreakdown.asignacion_reembolso_menor} por viáticos o movilización puntual` : null,
    causasBreakdown.prorrateo_dias_horas ? `${causasBreakdown.prorrateo_dias_horas} por prorrateo de días trabajados` : null,
    causasBreakdown.error_unidad_fuente ? `${causasBreakdown.error_unidad_fuente} por valores nominales residuales de origen` : null,
    causasBreakdown.anomalia_fuente ? `${causasBreakdown.anomalia_fuente} sin causa determinable en observaciones ('anomalía de la fuente')` : null,
  ].filter(Boolean).join(", ") || "clasificación forense en curso";

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
              <option value="Codigo del Trabajo">Código del Trabajo</option>
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

      {/* Grilla Principal */}
      {isLoading ? (
        <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-muted)" }}>
          Cargando nómina oficial...
        </div>
      ) : errorMessage ? (
        <div className="card" role="status" style={{ textAlign: "center", padding: "2.5rem" }}>
          <h3 style={{ margin: 0, color: "var(--text-primary)" }}>Nómina no disponible</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.5rem" }}>{errorMessage}</p>
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
                            style={{ fontSize: "0.65rem", color: "var(--accent)", textDecoration: "none", fontWeight: 700 }}
                            title="Ver fila original en portal oficial de Transparencia"
                          >
                            Ver fuente ↗
                          </a>
                        )}
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
    </div>
  );
}
