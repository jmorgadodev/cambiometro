"use client";
import {
  DASHBOARD_COMPONENTS,
  dashboardDietReferences,
  type DashboardComponent,
} from "@/lib/parliamentary-dashboard";
import {
  explorerMembers,
  explorerMetrics,
  explorerMoney,
  filterExplorerRecords,
  institutionLabel,
  type Dimension,
  type ExplorerData,
  type ExplorerQuery,
  type ExplorerRecord,
} from "@/lib/parliamentary-explorer";
import { DataState, MemberName } from "./ExplorerPrimitives";
import styles from "./Explorer.module.css";
export interface ExplorerContext {
  kind: Dimension | "record" | "methodology";
  id: string;
  component?: DashboardComponent;
  record?: ExplorerRecord;
}
export function detailQuery(
  q: ExplorerQuery,
  context: ExplorerContext | null,
): ExplorerQuery {
  if (!context) return q;
  const next = { ...q };
  const id = context.id;
  switch (context.kind) {
    case "member":
    case "team":
      next.memberIds = [id];
      next.member = "todos";
      break;
    case "party":
      next.partyIds = [id];
      break;
    case "region":
      next.regionIds = [id];
      break;
    case "district":
      next.districts = [id];
      break;
    case "period":
      next.from = id;
      next.to = id;
      break;
    case "component":
      next.component = id;
      next.componentIds = [id as DashboardComponent];
      break;
    case "category":
      next.category = id;
      break;
    case "item":
      next.item = id;
      break;
    case "role":
      next.roles = [id];
      break;
    case "institution":
      next.chamber = id;
      break;
    case "record":
      if (context.record) {
        next.memberIds = [context.record.memberId];
        next.member = "todos";
        next.from = context.record.period;
        next.to = context.record.period;
      }
      break;
  }
  if (context.component) {
    next.componentIds = [context.component];
    next.component = context.component;
  }
  return next;
}
export default function ExplorerDetail({
  data,
  q,
  context,
  records,
  loading,
  error,
  retry,
  onChange,
  onCompare,
  onShare,
}: {
  data: ExplorerData;
  q: ExplorerQuery;
  context: ExplorerContext;
  records: ExplorerRecord[];
  loading: boolean;
  error: string | null;
  retry: () => void;
  onChange: (q: ExplorerQuery) => void;
  onCompare: (kind: "member" | "party" | "region", id: string) => void;
  onShare: () => void;
}) {
  if (context.kind === "methodology")
    return (
      <div className={styles.methodology}>
        <h3>Metodología, fuentes y cobertura</h3>
        {data.notes.map((note) => (
          <p key={note}>{note}</p>
        ))}
        <h3>Qué representa cada cifra</h3>
        <dl>
          <dt>Monto informado</dt>
          <dd>
            Subtotal de observaciones con importe. La cobertura se informa por
            componente, sin sumar conceptos que puedan solaparse.
          </dd>
          <dt>Registros</dt>
          <dd>
            Observaciones administrativas. Un contrato puede aparecer en varios
            meses; no se acredita una persona única por cada fila.
          </dd>
          <dt>Personas únicas y total combinado</dt>
          <dd>
            No acreditables con los identificadores actuales. Se muestran
            parlamentarios, equipos y registros por separado, sin fabricar un
            total de personas.
          </dd>
          <dt>Territorio</dt>
          <dd>
            Representación parlamentaria; no ubicación física del gasto,
            residencia o lugar de trabajo del integrante.
          </dd>
          <dt>Cargo</dt>
          <dd>
            Se normalizan tildes, espacios y mayúsculas; se conserva la
            denominación original. No se equiparan automáticamente funciones.
          </dd>
          <dt>Comparación institucional</dt>
          <dd>
            Los montos nominales y glosas se presentan con institución y
            cobertura. No prueban reglas equivalentes, eficiencia o desempeño.
          </dd>
        </dl>
        <h3>Fuentes</h3>
        <ul>
          <li>
            <a
              href="https://www.camara.cl/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Cámara de Diputadas y Diputados
            </a>
          </li>
          <li>
            <a
              href="https://www.senado.cl/transparencia/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Senado · Transparencia
            </a>
          </li>
          <li>
            <a
              href="https://comision38bis.gob.cl/registro-publico"
              target="_blank"
              rel="noopener noreferrer"
            >
              Comisión del artículo 38 bis
            </a>
          </li>
        </ul>
        <h3>Versión y recuperación</h3>
        <p>
          Detalle diferido, verificado por checksum y correspondiente al mismo
          release. No se consulta D1 ni la API durante la exploración.
        </p>
        <p className={styles.version}>
          Release: {data.releaseId}
          <br />
          Proyección: {data.projectionId}
        </p>
        <details>
          <summary>Checksums de las entradas</summary>
          <dl className={styles.version}>
            {Object.entries(data.sources).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    );
  const scoped = detailQuery(q, context),
    metrics = explorerMetrics(data, scoped),
    members = explorerMembers(data, scoped);
  const rows = filterExplorerRecords(data, scoped, records);
  const selected =
    context.kind === "record" && context.record ? context.record : null;
  const showDietReferences =
    context.component === "dieta" ||
    (context.kind === "component" && context.id === "dieta");
  const references = showDietReferences
    ? dashboardDietReferences(
        {
          rows: data.facts,
          members: data.members,
          releaseId: data.releaseId,
          mode: "published",
          notes: data.notes,
        },
        scoped,
      )
    : [];
  const selectedMember = data.members.find(
    (m) =>
      m.id ===
      (selected?.memberId ??
        (["member", "team"].includes(context.kind) ? context.id : "")),
  );
  const title = selected
    ? (selected.personName ?? selected.item)
    : context.kind === "member" || context.kind === "team"
      ? data.members.find((m) => m.id === context.id)?.name
      : context.kind === "party"
        ? data.members.find((m) => m.partyId === context.id)?.partyLabel
        : context.kind === "region"
          ? data.members.find((m) => m.regionId === context.id)?.regionLabel
          : context.id;
  return (
    <div className={styles.viewStack}>
      <div>
        <p className="eyebrow">Detalle de la selección</p>
        <h3>{title}</h3>
        <p>
          {scoped.from} — {scoped.to}
        </p>
        {selectedMember && (
          <p>
            {selectedMember.partyLabel} ·{" "}
            {institutionLabel(selectedMember.chamber)} ·{" "}
            {selectedMember.regionLabel}
            {selectedMember.district
              ? ` · Distrito ${selectedMember.district}`
              : ""}
          </p>
        )}
        <p className={styles.hint}>
          Abrir este panel conserva los filtros globales.
        </p>
      </div>
      {selected ? (
        <RecordEvidence row={selected} />
      ) : (
        <>
          <div className={styles.detailMetrics}>
            {(Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[]).map(
              (c) => (
                <div key={c}>
                  <span>{DASHBOARD_COMPONENTS[c]}</span>
                  <strong>{explorerMoney(metrics.components[c].amount)}</strong>
                  <small>
                    {metrics.components[c].members}/{metrics.members} con
                    importe
                  </small>
                </div>
              ),
            )}
          </div>
          <h3>Parlamentarios asociados ({members.length})</h3>
          <div className={styles.memberList}>
            {members.slice(0, 12).map((m) => (
              <div key={m.id}>
                <MemberName
                  member={m}
                  onClick={() =>
                    onChange({
                      ...scoped,
                      memberIds: [m.id],
                      member: "todos",
                      view: "explorar",
                    })
                  }
                />
                <div className={styles.listActions}>
                  <button
                    type="button"
                    onClick={() => onCompare("member", m.id)}
                  >
                    Agregar a comparación
                  </button>
                  <a href={m.profileUrl}>Ficha completa ↗</a>
                </div>
                {m.photoSource && (
                  <small className={styles.hint}>
                    Imagen del catálogo verificado ·{" "}
                    <a
                      href={m.photoSource}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      procedencia
                    </a>
                  </small>
                )}
              </div>
            ))}
          </div>
          {showDietReferences && (
            <section>
              <h3>Referencias oficiales incorporadas</h3>
              <p className={styles.hint}>
                Último importe positivo por persona, aplicado como estimación a
                los meses seleccionados. No acredita pagos mensuales. El CSV del
                resumen conserva todas las referencias.
              </p>
              <div className={styles.tableScroll}>
                <table>
                  <thead>
                    <tr>
                      <th>Parlamentario</th>
                      <th>Período de origen</th>
                      <th>Referencia mensual CLP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {references.slice(0, 12).map((r) => (
                      <tr key={r.memberId}>
                        <td>
                          {data.members.find((m) => m.id === r.memberId)?.name}
                        </td>
                        <td>{r.period}</td>
                        <td>{explorerMoney(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className={styles.hint}>
                {references.length} referencias en la selección; vista previa de
                hasta 12.
              </p>
              <a
                href="https://comision38bis.gob.cl/registro-publico"
                target="_blank"
                rel="noopener noreferrer"
              >
                Consultar registro oficial 38 bis ↗
              </a>
            </section>
          )}
          <h3>
            {showDietReferences
              ? "Registros de pago"
              : "Registros relacionados"}
          </h3>
          <DataState
            loading={loading}
            error={error}
            onRetry={retry}
            empty={!showDietReferences && !loading && !error && !rows.length}
          />
          {showDietReferences && (
            <p className={styles.hint}>
              No se incluyen registros mensuales de pago para estas referencias.
            </p>
          )}
          {!loading && !error && (
            <div className={styles.evidenceList}>
              {rows.slice(0, 8).map((r) => (
                <details key={r.id}>
                  <summary>
                    {r.personName ?? r.item}
                    <strong>{explorerMoney(r.amount)}</strong>
                  </summary>
                  <RecordEvidence row={r} />
                </details>
              ))}
              {rows.length > 8 && (
                <p className={styles.hint}>
                  {rows.length} observaciones disponibles. Abre Registros para
                  buscar, ordenar y exportar todas.
                </p>
              )}
            </div>
          )}
        </>
      )}
      <div className={styles.contextActions}>
        {!selected && (
          <button
            type="button"
            className={styles.primary}
            onClick={() => onChange(scoped)}
          >
            Aplicar como filtro global
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange({ ...scoped, view: "registros" })}
        >
          Ver registros de esta selección
        </button>
        {["member", "party", "region"].includes(context.kind) && (
          <button
            type="button"
            onClick={() =>
              onCompare(
                context.kind as "member" | "party" | "region",
                context.id,
              )
            }
          >
            Agregar a comparación
          </button>
        )}
        <button type="button" onClick={onShare}>
          Copiar enlace de la consulta
        </button>
      </div>
    </div>
  );
}
export function RecordEvidence({ row: r }: { row: ExplorerRecord }) {
  return (
    <div className={styles.recordEvidence}>
      <dl>
        <dt>Período</dt>
        <dd>{r.period}</dd>
        <dt>Monto informado</dt>
        <dd>
          {explorerMoney(r.amount)}
          {r.amount === 0 ? " · cero informado" : ""}
        </dd>
        {r.personName && (
          <>
            <dt>Integrante publicado</dt>
            <dd>{r.personName}</dd>
            <dt>Cargo original</dt>
            <dd>{r.originalRole ?? "No informado"}</dd>
            <dt>Normalización ortográfica</dt>
            <dd>{r.role}</dd>
            <dt>Modalidad publicada</dt>
            <dd>{r.contractType ?? "No informada"}</dd>
          </>
        )}
        <dt>ID del origen</dt>
        <dd>
          {r.sourceRecordId ??
            "No disponible; el ID interno identifica una observación, no una persona"}
        </dd>
        <dt>Fuente</dt>
        <dd>{r.sourceLabel}</dd>
        <dt>Alcance del respaldo</dt>
        <dd>
          {r.sourceScope === "individual"
            ? "Documento individual disponible"
            : r.sourceScope === "institutional"
              ? "Página o servicio institucional; no es un enlace individual al registro"
              : r.sourceScope === "aggregate"
                ? "Agregado publicado"
                : "Sin respaldo individual incorporado"}
        </dd>
        <dt>Captura individual</dt>
        <dd>{r.retrievedAt ?? "No informada para este registro"}</dd>
        {r.sourceSnapshotAt && (
          <>
            <dt>Proyección de la fuente</dt>
            <dd>{r.sourceSnapshotAt} · fecha del archivo, no de cada pago</dd>
          </>
        )}
      </dl>
      {r.sourceUrl && (
        <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">
          Consultar fuente disponible ↗
        </a>
      )}
      {r.documentUrls
        ?.filter((u) => u !== r.sourceUrl)
        .map((u) => (
          <a key={u} href={u} target="_blank" rel="noopener noreferrer">
            Documento asociado ↗
          </a>
        ))}
    </div>
  );
}
