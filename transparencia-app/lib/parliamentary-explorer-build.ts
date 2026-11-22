import {
  buildSenateFinancialOfficeIndex,
  buildSenateFinancialOwnerIndex,
} from "./senate-financial-identity";
import { createHash } from "node:crypto";
import FOTOS_POLITICOS from "../data/politicos-fotos.json";
import { POLITICOS_SEED } from "./politicos";
import { diputadoIdParaPolitico, type EtlRecord } from "./data-source";
import type { PersonalApoyoDataset } from "./personal-apoyo";
import { esFilaResumenTotal } from "./gastos-operacionales";
import { parseSpanishMonthPeriod } from "./month-periods";
import { parsePublishedClpAmount } from "./parliamentary-cost-periods";
import {
  expenseReadingCategory,
  validDashboardMonth,
  type DashboardData,
} from "./parliamentary-dashboard";
import {
  aggregateExplorerRecords,
  normalizeExplorerRegion,
  normalizeExplorerRole,
} from "./parliamentary-explorer-projection";
import type {
  ExplorerData,
  ExplorerMember,
  ExplorerRecord,
} from "./parliamentary-explorer";

export const explorerHash = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
const safeUrl = (value: unknown) =>
  typeof value === "string" && /^https?:\/\//.test(value) ? value : undefined;
const photoAttribution = (value: string) => {
  const url = new URL(value);
  if (
    url.hostname === "upload.wikimedia.org" &&
    url.pathname.includes("/commons/")
  ) {
    const parts = url.pathname.split("/"),
      thumb = parts.indexOf("thumb"),
      file = thumb >= 0 ? parts[thumb + 3] : parts.at(-1)!;
    return (
      "https://commons.wikimedia.org/wiki/File:" +
      encodeURIComponent(decodeURIComponent(file))
    );
  }
  return value;
};
const safeAmount = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) ? value : null;

export function buildExplorerData(input: {
  legacy: DashboardData;
  camara: EtlRecord[];
  senado: EtlRecord[];
  staff: PersonalApoyoDataset;
  sources: Record<string, string>;
  snapshotDates?: { camara?: string; senado?: string };
}) {
  const { legacy, staff } = input;
  if (!legacy.releaseId) throw new Error("EXPLORER_UNVERIFIED_RELEASE");
  const releaseId = legacy.releaseId;
  const members: ExplorerMember[] = legacy.members.map((m) => {
    const politician = POLITICOS_SEED.find((p) => p.id === m.id);
    if (!politician) throw new Error("EXPLORER_MEMBER_NOT_IN_CATALOG");
    const deputyId = diputadoIdParaPolitico(politician);
    const profile = deputyId ? staff.diputados[deputyId]?.ficha : undefined;
    const verifiedPhotos = FOTOS_POLITICOS as Record<string, string>;
    const photo =
      safeUrl(verifiedPhotos[m.id]) ??
      safeUrl(profile?.foto) ??
      safeUrl(politician.foto_url);
    return {
      ...m,
      ...normalizeExplorerRegion(profile?.region ?? politician.distrito_region),
      district:
        m.chamber === "camara"
          ? String(
              profile?.numero_distrito ?? politician.numero_distrito ?? "",
            ) || null
          : null,
      photo,
      photoSource: verifiedPhotos[m.id]
        ? photoAttribution(verifiedPhotos[m.id])
        : profile?.foto
          ? (profile.perfil_fuente ?? undefined)
          : politician.fuente,
      profileUrl: `/politico/${m.id}/`,
      territorySource: profile?.perfil_fuente ?? politician.fuente,
    };
  });
  const records: ExplorerRecord[] = [];
  const push = (
    m: ExplorerMember,
    row: Omit<ExplorerRecord, "id" | "memberId" | "releaseId">,
  ) => {
    if (!validDashboardMonth(row.period)) return;
    // This opaque key identifies an observation, never a person. No identifier is derived from a name/RUT.
    records.push({
      ...row,
      id: `obs-${m.chamber}-${records.length + 1}`,
      memberId: m.id,
      releaseId,
    });
  };
  const expenseOwners = buildSenateFinancialOwnerIndex(
    members.filter((x) => x.chamber === "senado"),
    input.senado.map((r) => r.nombre ?? ""),
  );
  const offices = Object.keys(staff.senadores ?? {});
  const senateIndex = buildSenateFinancialOfficeIndex(
    members.filter((m) => m.chamber === "senado"),
    offices,
  );
  for (const m of members) {
    const p = POLITICOS_SEED.find((p) => p.id === m.id)!;
    const deputyId = diputadoIdParaPolitico(p);
    const expenseRows =
      m.chamber === "camara"
        ? input.camara.filter((r) => String(r.diputado_id) === deputyId)
        : input.senado.filter(
            (r) => !!r.nombre && expenseOwners.get(r.nombre) === m.id,
          );
    const byPeriod = Map.groupBy(expenseRows, (r) =>
      String(r.periodo ?? r.fecha?.slice(0, 7) ?? ""),
    );
    for (const [period, rows] of byPeriod) {
      const hasItems = rows.some(
        (r) =>
          !esFilaResumenTotal(
            String(r.item ?? r.categoria ?? r.concepto ?? r.title ?? ""),
          ) && safeAmount(r.monto_clp) !== null,
      );
      for (const r of rows) {
        const item = String(
          r.item ?? r.categoria ?? r.concepto ?? r.title ?? "",
        ).trim();
        if (
          !item ||
          (hasItems && esFilaResumenTotal(item)) ||
          (!hasItems && !esFilaResumenTotal(item)) ||
          safeAmount(r.monto_clp) === null
        )
          continue;
        const sourceUrl = safeUrl(r.url);
        const sourceRecordId = /^\d{7,8}-[\dkK]$/.test(r.id) ? undefined : r.id;
        push(m, {
          period,
          component: "gastos",
          category: expenseReadingCategory(
            hasItems ? item : "Total publicado sin desglose",
          ),
          item: hasItems ? item : "Total publicado sin desglose",
          amount: safeAmount(r.monto_clp),
          recordCount: 1,
          sourceRecordId,
          sourceSnapshotAt: input.snapshotDates?.[m.chamber],
          sourceUrl,
          sourceScope: sourceUrl
            ? /\.pdf(?:$|\?)/i.test(sourceUrl)
              ? "individual"
              : "institutional"
            : "unavailable",
          sourceLabel:
            m.chamber === "camara"
              ? "Cámara · gastos operacionales"
              : "Senado · gastos operacionales",
          retrievedAt:
            typeof r.retrieved_at === "string" ? r.retrieved_at : undefined,
        });
      }
    }
    if (m.chamber === "camara" && deputyId) {
      const d = staff.diputados[deputyId];
      if (!d) continue;
      const snapshots = Object.entries(d.personal_apoyo_por_periodo ?? {}).map(
        ([period, s]) => ({ period, ...s }),
      );
      const legacyPeriod = parseSpanishMonthPeriod(d.mes_personal);
      if (
        legacyPeriod &&
        !snapshots.some((s) => s.period === legacyPeriod) &&
        d.personal_apoyo?.length
      )
        snapshots.push({
          period: legacyPeriod,
          periodo: d.mes_personal,
          status: "available",
          rows: d.personal_apoyo,
          retrieved_at: null,
        });
      for (const snap of snapshots) {
        if (!["available", "empty_confirmed"].includes(snap.status)) continue;
        if (!snap.rows.length && snap.status === "empty_confirmed")
          push(m, {
            period: snap.period,
            component: "personal",
            category: "Personal de apoyo",
            item: "Nómina mensual",
            amount: 0,
            recordCount: 0,
            sourceScope: "institutional",
            sourceUrl: `https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=${deputyId}`,
            sourceLabel: "Cámara · nómina mensual vacía confirmada",
          });
        for (const r of snap.rows)
          push(m, {
            period: snap.period,
            component: "personal",
            category: "Personal de apoyo",
            item: "Nómina mensual",
            role: normalizeExplorerRole(r.cargo),
            originalRole: r.cargo,
            personName: r.nombre,
            amount: safeAmount(r.sueldo),
            recordCount: 1,
            contractType: r.tipo,
            sourceScope: "institutional",
            sourceUrl: `https://www.camara.cl/diputados/detalle/personaldepoyo.aspx?prmId=${deputyId}`,
            sourceLabel: "Cámara · personal de apoyo",
            retrievedAt: snap.retrieved_at ?? undefined,
          });
      }
      const section = d.transparencia_camara?.asesorias_externas;
      const periods =
        section?.periods ??
        (section?.period &&
        ["available", "empty_confirmed"].includes(section.status)
          ? [
              {
                period: section.period,
                status: section.status,
                rows: section.rows,
                retrieved_at: section.retrieved_at,
              },
            ]
          : []);
      for (const snap of periods) {
        const period = parseSpanishMonthPeriod(snap.period);
        if (!period) continue;
        if (!snap.rows.length && snap.status === "empty_confirmed")
          push(m, {
            period,
            component: "asesorias",
            category: "Asesorías externas",
            item: "Contratos externos",
            amount: 0,
            recordCount: 0,
            sourceScope: "institutional",
            sourceUrl: safeUrl(section?.source_url),
            sourceLabel: "Cámara · asesorías externas",
          });
        for (const r of snap.rows) {
          const documents = r.sourceLinks.filter((u) => !!safeUrl(u));
          push(m, {
            period,
            component: "asesorias",
            category: "Asesorías externas",
            item: "Contratos externos",
            amount: parsePublishedClpAmount(r.values.Monto),
            recordCount: 1,
            sourceScope: documents.length ? "individual" : "institutional",
            sourceUrl: documents[0] ?? safeUrl(section?.source_url),
            documentUrls: documents,
            sourceLabel: "Cámara · asesorías externas",
            retrievedAt: snap.retrieved_at,
          });
        }
      }
    } else if (m.chamber === "senado") {
      const office = senateIndex.get(m.id);
      if (!office) continue;
      for (const r of staff.senadores[office])
        push(m, {
          sourceOffice: office,
          period: r.periodo,
          component: "personal",
          category: "Personal de apoyo",
          item: "Nómina mensual",
          role: normalizeExplorerRole(r.cargo),
          originalRole: r.cargo,
          personName: [r.nombre, r.apellido_paterno, r.apellido_materno]
            .filter(Boolean)
            .join(" "),
          amount: safeAmount(r.monto),
          recordCount: 1,
          contractType: r.calidad_juridica,
          sourceUrl: safeUrl(staff.fuentes.senado?.url),
          sourceScope: "institutional",
          sourceLabel: "Senado · personal de apoyo",
          sourceSnapshotAt: staff.generado_en,
        });
    }
  }
  const facts = aggregateExplorerRecords(records);
  for (const row of legacy.rows.filter((r) => r.component === "dieta"))
    facts.push({ ...row, recordCount: 0 });
  // Reconciliation is per authority/month/component; no compensating discrepancies across people.
  const totals = (
    rows: readonly {
      memberId: string;
      period: string;
      component: string;
      amount: number | null;
    }[],
  ) => {
    const map = new Map<string, number | null>();
    for (const r of rows) {
      const k = [r.memberId, r.period, r.component].join("|");
      if (!map.has(k)) map.set(k, null);
      if (r.amount !== null) map.set(k, (map.get(k) ?? 0) + r.amount);
    }
    return map;
  };
  const old = totals(legacy.rows),
    now = totals(facts);
  for (const [key, value] of old)
    if (now.get(key) !== value)
      throw new Error(
        `EXPLORER_RECONCILIATION_FAILED:${key}:${value}:${now.get(key)}`,
      );
  for (const [key, value] of now)
    if (!old.has(key) && value !== null)
      throw new Error(`EXPLORER_UNEXPECTED_FINANCIAL_SCOPE:${key}`);
  const data: ExplorerData = {
    schemaVersion: 1,
    releaseId,
    members,
    facts,
    partitions: [],
    sources: input.sources,
    notes: [
      "Partido del catálogo vigente; no atribuye afiliación histórica a cada mes.",
      "Región de representación parlamentaria: no acredita dónde ocurrió el gasto ni dónde trabaja el equipo.",
      "Los componentes pueden solaparse y se presentan separados. No constituyen costo consolidado.",
      "Dieta: última referencia oficial positiva aplicada como estimación fija a cada mes, con período de origen. No es pago mensual acreditado.",
      "Las filas de apoyo son registros administrativos, no personas únicas. No se deduplican por nombre, cargo o monto.",
      "Cargos normalizados sólo en mayúsculas, tildes y espacios. No se homologan funciones entre instituciones.",
      "Categorías de lectura propias; se conservan las glosas originales. Una comparación entre cámaras no acredita equivalencia de reglas ni desempeño.",
      "Ausencia de publicación no equivale a cero. Un importe parcial conserva su cobertura.",
    ],
  };
  return {
    data,
    records,
    reconciliation: {
      groups: old.size,
      baselineRows: legacy.rows.length,
      summaryFacts: facts.length,
      administrativeRows: records.reduce((s, r) => s + r.recordCount, 0),
    },
  };
}
