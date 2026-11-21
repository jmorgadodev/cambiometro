"use client";
import {
  DASHBOARD_COMPONENTS,
  dashboardDietReferences,
  type DashboardComponent,
} from "@/lib/parliamentary-dashboard";
import {
  filterExplorerFacts,
  groupExplorer,
  explorerMetrics,
  explorerMoney,
  filterExplorerRecords,
  institutionLabel,
  type Dimension,
  type ExplorerData,
  type ExplorerQuery,
  type ExplorerRecord,
} from "@/lib/parliamentary-explorer";
import {
  monthlyRosterCount,
  sortAmountDesc,
} from "@/lib/parliamentary-explorer-ux";
import { DataState, MemberAvatar } from "./ExplorerPrimitives";
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
      next.component = "personal";
      next.componentIds = ["personal"];
      next.category = "todas";
      next.item = "todos";
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
  onApply,
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
  onApply: () => void;
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
          <dt>Integrantes identificados en una nómina mensual</dt>
          <dd>
            Conteo nominal sólo para un equipo y un mes, con nombre completo en
            cada registro y sin nombres repetidos. No identifica personas únicas
            entre equipos o meses. Si hay nombres incompletos, duplicados o
            varios vínculos sin resolver, se omite el indicador; no se
            deduplican contratos por aproximación.
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
  const scoped = detailQuery(q, context);
  const metrics = explorerMetrics(data, scoped);
  const rows = sortAmountDesc(filterExplorerRecords(data, scoped, records));
  const selected = context.kind === "record" ? context.record : null;
  const selectedMember = data.members.find(
    (m) =>
      m.id ===
      (selected?.memberId ??
        (["member", "team"].includes(context.kind) ? context.id : "")),
  );
  const focus =
    context.kind === "role" || context.kind === "team"
      ? "personal"
      : (context.component ??
        (context.kind === "component"
          ? (context.id as DashboardComponent)
          : q.metricComponent));
  const isPerson = ["member", "team"].includes(context.kind);
  const isBroadPerson =
    isPerson && !context.component && context.kind !== "team";
  const relevant = (
    isBroadPerson
      ? (Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[])
      : [focus]
  ).filter((c) => metrics.components[c]?.amount !== null);
  const title = selected
    ? (selected.personName ?? selected.item)
    : (selectedMember?.name ??
      (context.kind === "party"
        ? data.members.find((m) => m.partyId === context.id)?.partyLabel
        : context.kind === "region"
          ? data.members.find((m) => m.regionId === context.id)?.regionLabel
          : context.kind === "component"
            ? DASHBOARD_COMPONENTS[focus]
            : context.kind === "institution"
              ? institutionLabel(context.id)
              : context.id));
  const dimension =
    context.kind === "category"
      ? "item"
      : context.kind === "role"
        ? "team"
        : isPerson && focus === "personal"
          ? "role"
          : isPerson
            ? "category"
            : context.kind === "item"
              ? "team"
              : "category";
  const breakdown = groupExplorer(
    data,
    { ...scoped, metricComponent: focus, measure: "amount", order: "desc" },
    dimension,
    filterExplorerFacts(data, scoped),
  );
  const nominal =
    !loading &&
    !error &&
    isPerson &&
    focus === "personal" &&
    !scoped.roles.length &&
    scoped.category === "todas" &&
    scoped.item === "todos"
      ? monthlyRosterCount(rows, scoped.from, scoped.to)
      : null;
  const references =
    focus === "dieta"
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
  const canCompare = ["member", "team", "party", "region"].includes(
    context.kind,
  );
  return (
    <div className={styles.viewStack}>
      <header>
        <p className="eyebrow">
          {selected
            ? "Registro"
            : context.kind === "role"
              ? "Cargo de apoyo"
              : "Detalle"}
        </p>
        <h3>{title}</h3>
        <p>
          {scoped.from === scoped.to
            ? scoped.from
            : `${scoped.from} — ${scoped.to}`}
        </p>
        {selectedMember && (
          <p>
            {selectedMember.name} · {institutionLabel(selectedMember.chamber)} ·{" "}
            {selectedMember.partyLabel}
          </p>
        )}
      </header>
      {selected ? (
        <RecordEvidence row={selected} />
      ) : (
        <>
          <div className={styles.detailMetrics}>
            {relevant.map((c) => (
              <div key={c}>
                <span>
                  {c === "dieta"
                    ? "Dieta · referencia estimada"
                    : DASHBOARD_COMPONENTS[c]}
                </span>
                <strong>{explorerMoney(metrics.components[c].amount)}</strong>
              </div>
            ))}
            {focus === "personal" && (
              <div>
                <span>Registros de apoyo</span>
                <strong>
                  {metrics.components.personal.records.toLocaleString("es-CL")}
                </strong>
              </div>
            )}
            {nominal !== null && (
              <div>
                <span>Integrantes identificados en la nómina</span>
                <strong>{nominal}</strong>
              </div>
            )}
          </div>
          {relevant.length === 0 && (
            <p>Sin importe publicado para esta selección.</p>
          )}
          {breakdown.length > 0 && (
            <section>
              <h3>
                {context.kind === "role"
                  ? "Equipos relacionados"
                  : focus === "personal" && isPerson
                    ? "Cargos publicados"
                    : "Desglose"}
              </h3>
              <div
                className={styles.detailBreakdown}
                aria-label="Desglose monetario"
                role="region"
                tabIndex={0}
              >
                {breakdown.slice(0, 12).map((g) => (
                  <div key={g.id} data-amount={g.value ?? undefined}>
                    <span>{g.label}</span>
                    <strong>{explorerMoney(g.value)}</strong>
                  </div>
                ))}
              </div>
              {breakdown.length > 12 && (
                <details>
                  <summary>Ver {breakdown.length - 12} resultados más</summary>
                  <div className={styles.detailBreakdown}>
                    {breakdown.slice(12).map((g) => (
                      <div key={g.id}>
                        <span>{g.label}</span>
                        <strong>{explorerMoney(g.value)}</strong>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </section>
          )}
          {references.length > 0 && (
            <details>
              <summary>
                Referencia oficial de dieta ({references.length})
              </summary>
              <p>
                Última referencia positiva aplicada a los meses seleccionados.
              </p>
              <div className={styles.detailBreakdown}>
                {sortAmountDesc(references)
                  .slice(0, 12)
                  .map((r) => (
                    <div key={r.memberId}>
                      <span>
                        {data.members.find((m) => m.id === r.memberId)?.name} ·{" "}
                        {r.period}
                      </span>
                      <strong>{explorerMoney(r.amount)}</strong>
                    </div>
                  ))}
              </div>
              <a
                href="https://comision38bis.gob.cl/registro-publico"
                target="_blank"
                rel="noopener noreferrer"
              >
                Registro oficial 38 bis ↗
              </a>
            </details>
          )}
          {focus !== "dieta" && (
            <section>
              <h3>Registros relacionados</h3>
              <DataState
                loading={loading}
                error={error}
                onRetry={retry}
                empty={!loading && !error && !rows.length}
              />
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
                </div>
              )}
              {rows.length > 8 && (
                <small>
                  {rows.length.toLocaleString("es-CL")} registros · ver todos en
                  Registros
                </small>
              )}
            </section>
          )}
          {selectedMember && (
            <details>
              <summary>Antecedentes y fotografía</summary>
              <MemberAvatar member={selectedMember} size={48} />
              <p>
                {selectedMember.regionLabel}
                {selectedMember.district
                  ? ` · Distrito ${selectedMember.district}`
                  : ""}
              </p>
              <a href={selectedMember.profileUrl}>Ficha parlamentaria ↗</a>
              {selectedMember.photoSource && (
                <p>
                  <a
                    href={selectedMember.photoSource}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Procedencia de la fotografía ↗
                  </a>
                </p>
              )}
            </details>
          )}
        </>
      )}
      <div className={styles.contextActions}>
        {!selected && (
          <button type="button" className={styles.primary} onClick={onApply}>
            {["member", "team", "party", "region", "district", "role"].includes(
              context.kind,
            )
              ? "Agregar al filtro global"
              : "Aplicar como filtro global"}
          </button>
        )}
        {!selected && focus !== "dieta" && (
          <button
            type="button"
            onClick={() => onChange({ ...scoped, view: "registros" })}
          >
            Ver registros de esta selección
          </button>
        )}
        {canCompare && (
          <button
            type="button"
            onClick={() =>
              onCompare(
                context.kind === "team"
                  ? "member"
                  : (context.kind as "member" | "party" | "region"),
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
        {r.personName && (
          <>
            <dt>Nombre publicado</dt>
            <dd>{r.personName}</dd>
            <dt>Cargo</dt>
            <dd>{r.originalRole ?? r.role ?? "No publicado"}</dd>
          </>
        )}
        {!r.personName && (
          <>
            <dt>Ítem</dt>
            <dd>{r.item}</dd>
          </>
        )}
        <dt>Período</dt>
        <dd>{r.period}</dd>
        <dt>Monto informado</dt>
        <dd>{explorerMoney(r.amount)}</dd>
        <dt>Fuente</dt>
        <dd>{r.sourceLabel}</dd>
      </dl>
      {r.sourceUrl && (
        <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer">
          {r.sourceScope === "individual"
            ? "Consultar documento"
            : "Consultar fuente institucional"}{" "}
          ↗
        </a>
      )}
      <details>
        <summary>Datos del respaldo</summary>
        <dl className={styles.version}>
          <dt>Observación</dt>
          <dd>{r.id}</dd>
          <dt>ID del origen</dt>
          <dd>{r.sourceRecordId ?? "No publicado"}</dd>
          <dt>Alcance</dt>
          <dd>{r.sourceScope}</dd>
          {r.contractType && (
            <>
              <dt>Modalidad</dt>
              <dd>{r.contractType}</dd>
            </>
          )}
          {r.role && (
            <>
              <dt>Cargo normalizado</dt>
              <dd>{r.role}</dd>
            </>
          )}
          {r.retrievedAt && (
            <>
              <dt>Captura individual</dt>
              <dd>{r.retrievedAt}</dd>
            </>
          )}
          {r.sourceSnapshotAt && (
            <>
              <dt>Generación del archivo fuente</dt>
              <dd>{r.sourceSnapshotAt}</dd>
            </>
          )}
          <dt>Release</dt>
          <dd>{r.releaseId}</dd>
        </dl>
        {r.documentUrls
          ?.filter((u) => u !== r.sourceUrl)
          .map((u) => (
            <a key={u} href={u} target="_blank" rel="noopener noreferrer">
              Documento asociado ↗
            </a>
          ))}
      </details>
    </div>
  );
}
