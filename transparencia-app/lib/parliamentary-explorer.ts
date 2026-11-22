import {
  DASHBOARD_COMPONENTS,
  dashboardDefaults,
  dashboardFiltersFromParams,
  dashboardParams,
  dashboardSurname,
  filterDashboardRows,
  type DashboardComponent,
  type DashboardData,
  type DashboardFilters,
  type DashboardMember,
  type DashboardRow,
} from "./parliamentary-dashboard";

export const EXPLORER_VIEWS = {
  panorama: "Panorama",
  explorar: "Explorar",
  comparar: "Comparar",
  personal: "Personal de apoyo",
  registros: "Registros",
} as const;
export type ExplorerView = keyof typeof EXPLORER_VIEWS;
export type Dimension =
  | "member"
  | "party"
  | "region"
  | "district"
  | "period"
  | "component"
  | "category"
  | "item"
  | "role"
  | "team"
  | "institution";
export type Measure = "amount" | "records" | "members" | "teams";
export const DIMENSIONS: Record<Dimension, string> = {
  member: "Parlamentario",
  party: "Partido vigente",
  region: "Región de representación",
  district: "Distrito",
  period: "Mes",
  component: "Componente",
  category: "Categoría",
  item: "Ítem original",
  role: "Cargo de apoyo",
  team: "Equipo parlamentario",
  institution: "Institución",
};
export const MEASURES: Record<Measure, string> = {
  amount: "Monto informado (CLP)",
  records: "Registros administrativos",
  members: "Parlamentarios con registros",
  teams: "Equipos de apoyo",
};
export interface ExplorerMember extends DashboardMember {
  regionId: string;
  regionLabel: string;
  district: string | null;
  photo?: string;
  photoSource?: string;
  profileUrl: string;
  territorySource?: string;
}
export interface ExplorerFact extends DashboardRow {
  recordCount: number;
  role?: string;
}
export interface DetailPartition {
  path: string;
  sha256: string;
  bytes: number;
  period: string;
  chamber: "camara" | "senado";
  count: number;
  component?: DashboardComponent;
}
export interface ExplorerData {
  schemaVersion: 1;
  releaseId: string;
  projectionId?: string;
  members: ExplorerMember[];
  facts: ExplorerFact[];
  partitions: DetailPartition[];
  sources: Record<string, string>;
  notes: string[];
}
export interface ExplorerQuery extends DashboardFilters {
  view: ExplorerView;
  regionIds: string[];
  districts: string[];
  roles: string[];
  groupBy: Dimension;
  measure: Measure;
  order: "desc" | "asc";
  metricComponent: DashboardComponent;
  compareBy: "member" | "party" | "region";
  compareIds: string[];
  comparisonSection:
    "resumen" | "gastos" | "categorias" | "personal" | "periodos";
  query: string;
}
export interface ExplorerRecord extends ExplorerFact {
  id: string;
  sourceOffice?: string;
  providerName?: string;
  serviceDescription?: string;
  originalConcept?: string;
  originalDescription?: string;
  sourceFields?: Record<string, string>;
  sourceRecordId?: string;
  personName?: string;
  originalRole?: string;
  contractType?: string;
  sourceUrl?: string;
  sourceScope: "individual" | "institutional" | "aggregate" | "unavailable";
  sourceLabel: string;
  retrievedAt?: string;
  sourceSnapshotAt?: string;
  documentUrls?: string[];
  releaseId: string;
}
export interface PartitionData {
  schemaVersion: 1;
  releaseId: string;
  rows: ExplorerRecord[];
}
export interface ExplorerBootstrap extends Omit<ExplorerData, "facts"> {
  dictionaries: {
    periods: string[];
    categories: string[];
    items: string[];
    roles: string[];
  };
  packedFacts: (number | null)[][];
}
export const normalizeExplorerText = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/\s+/g, " ")
    .trim();
export const explorerMoney = (amount: number | null) =>
  amount === null ? "Sin información" : "$" + amount.toLocaleString("es-CL");
export const institutionLabel = (chamber: string) =>
  chamber === "camara"
    ? "Diputados"
    : chamber === "senado"
      ? "Senado"
      : "Ambas cámaras";
const components = Object.keys(DASHBOARD_COMPONENTS) as DashboardComponent[];
const asDashboard = (data: ExplorerData): DashboardData => ({
  members: data.members,
  rows: data.facts,
  releaseId: data.releaseId,
  mode: "published",
  notes: data.notes,
});

export function explorerDefaults(data: ExplorerData): ExplorerQuery {
  return {
    ...dashboardDefaults(asDashboard(data)),
    regionIds: [],
    districts: [],
    roles: [],
    view: "panorama",
    groupBy: "member",
    measure: "amount",
    order: "desc",
    metricComponent: "gastos",
    compareBy: "member",
    compareIds: [],
    comparisonSection: "resumen",
    query: "",
  };
}
export function explorerMembers(
  data: ExplorerData,
  q: ExplorerQuery,
): ExplorerMember[] {
  const ids = q.memberIds?.length
    ? q.memberIds
    : q.member !== "todos"
      ? [q.member]
      : [];
  return data.members.filter(
    (m) =>
      (q.chamber === "ambas" || q.chamber === m.chamber) &&
      (!q.partyIds?.length ||
        q.partyIds.includes(m.partyId ?? "sin-partido")) &&
      (!ids.length || ids.includes(m.id)) &&
      (!q.regionIds.length || q.regionIds.includes(m.regionId)) &&
      (!q.districts.length ||
        (m.district !== null && q.districts.includes(m.district))),
  );
}
export function explorerQueryFromParams(
  params: URLSearchParams,
  data: ExplorerData,
): ExplorerQuery {
  const defaults = explorerDefaults(data),
    old = dashboardFiltersFromParams(params, asDashboard(data));
  const selected = (key: string, valid: Set<string>) =>
    [...new Set(params.getAll(key))].filter((v) => valid.has(v)).slice(0, 250);
  const has = <T extends string>(
    value: string | null,
    choices: readonly T[],
    fallback: T,
  ): T => (choices.includes(value as T) ? (value as T) : fallback);
  const base: ExplorerQuery = {
    ...defaults,
    ...old,
    regionIds: selected("region", new Set(data.members.map((m) => m.regionId))),
    districts: selected(
      "distrito",
      new Set(data.members.flatMap((m) => (m.district ? [m.district] : []))),
    ),
    roles: selected(
      "cargo",
      new Set(data.facts.flatMap((r) => (r.role ? [r.role] : []))),
    ),
    view: has(
      params.get("vista"),
      Object.keys(EXPLORER_VIEWS) as ExplorerView[],
      "panorama",
    ),
    groupBy: has(
      params.get("agrupar"),
      Object.keys(DIMENSIONS) as Dimension[],
      "member",
    ),
    measure: has(
      params.get("medida"),
      Object.keys(MEASURES) as Measure[],
      "amount",
    ),
    order: params.get("orden") === "asc" ? "asc" : "desc",
    metricComponent: has(params.get("metrica"), components, "gastos"),
    compareBy: has(
      params.get("comparar"),
      ["member", "party", "region"] as const,
      "member",
    ),
    comparisonSection: has(
      params.get("seccion"),
      ["resumen", "gastos", "categorias", "personal", "periodos"] as const,
      "resumen",
    ),
    query: (params.get("buscar") ?? "").slice(0, 180),
  };
  // Known but currently empty categories stay selected: absence must not broaden a shared query.
  base.category = data.facts.some((r) => r.category === params.get("categoria"))
    ? params.get("categoria")!
    : old.category;
  base.item = data.facts.some((r) => r.item === params.get("item"))
    ? params.get("item")!
    : old.item;
  const validCompare = new Set(
    data.members.map((m) =>
      base.compareBy === "member"
        ? m.id
        : base.compareBy === "party"
          ? (m.partyId ?? "sin-partido")
          : m.regionId,
    ),
  );
  base.compareIds = selected("participante", validCompare);
  if (
    !base.compareIds.length &&
    !params.has("participante") &&
    !params.has("participantes")
  )
    base.compareIds =
      base.compareBy === "member"
        ? [...(old.memberIds ?? [])]
        : base.compareBy === "party"
          ? [...(old.partyIds ?? [])]
          : [...base.regionIds];
  const active = base.componentIds?.length ? base.componentIds : components;
  if (!active.includes(base.metricComponent)) base.metricComponent = active[0];
  return base;
}
export function explorerParams(q: ExplorerQuery): URLSearchParams {
  const p = dashboardParams(q);
  p.set("v", "1");
  p.set("participantes", "explicitos");
  p.set("vista", q.view);
  p.set("agrupar", q.groupBy);
  p.set("medida", q.measure);
  p.set("orden", q.order);
  p.set("metrica", q.metricComponent);
  p.set("comparar", q.compareBy);
  p.set("seccion", q.comparisonSection);
  for (const [key, values] of [
    ["region", q.regionIds],
    ["distrito", q.districts],
    ["cargo", q.roles],
    ["participante", q.compareIds],
  ] as const)
    for (const v of [...new Set(values)]) p.append(key, v);
  if (q.query) p.set("buscar", q.query);
  return p;
}
export function filterExplorerFacts(
  data: ExplorerData,
  q: ExplorerQuery,
): ExplorerFact[] {
  const members = explorerMembers(data, q);
  // Retain monthly diet estimates and their reference period from the proven financial model.
  const rows = filterDashboardRows(
    { ...asDashboard(data), members },
    q,
  ) as ExplorerFact[];
  const term = normalizeExplorerText(q.query);
  const memberMap = new Map(members.map((m) => [m.id, m]));
  return rows
    .filter(
      (r) =>
        (!q.roles.length || (!!r.role && q.roles.includes(r.role))) &&
        (!term ||
          normalizeExplorerText(
            [r.item, r.category, r.role, memberMap.get(r.memberId)?.name].join(
              " ",
            ),
          ).includes(term)),
    )
    .map((r) => (r.estimated ? { ...r, recordCount: 0 } : r));
}
export function explorerMetrics(data: ExplorerData, q: ExplorerQuery) {
  const facts = filterExplorerFacts(data, q),
    members = explorerMembers(data, q);
  const summary = Object.fromEntries(
    components.map((c) => {
      const rows = facts.filter((r) => r.component === c),
        known = rows.filter((r) => r.amount !== null);
      return [
        c,
        {
          amount: known.length
            ? known.reduce((s, r) => s + r.amount!, 0)
            : null,
          records: rows.reduce((s, r) => s + r.recordCount, 0),
          members: new Set(known.map((r) => r.memberId)).size,
          months: new Set(known.map((r) => r.period)).size,
          missing: rows.filter((r) => r.amount === null).length,
        },
      ];
    }),
  ) as Record<
    DashboardComponent,
    {
      amount: number | null;
      records: number;
      members: number;
      months: number;
      missing: number;
    }
  >;
  return {
    components: summary,
    members: members.length,
    deputies: members.filter((m) => m.chamber === "camara").length,
    senators: members.filter((m) => m.chamber === "senado").length,
    records: facts.reduce((s, r) => s + r.recordCount, 0),
    teams: new Set(
      facts
        .filter((r) => r.component === "personal" && r.recordCount > 0)
        .map((r) => r.memberId),
    ).size,
  };
}
export function explorerGroupKey(
  row: ExplorerFact,
  m: ExplorerMember,
  dimension: Dimension,
) {
  switch (dimension) {
    case "member":
    case "team":
      return [m.id, m.name];
    case "party":
      return [
        m.partyId ?? "sin-partido",
        m.partyLabel ?? "Sin partido incorporado",
      ];
    case "region":
      return [m.regionId, m.regionLabel];
    case "district":
      return [
        m.district ?? "no-aplica",
        m.district ? `Distrito ${m.district}` : "Sin distrito (Senado)",
      ];
    case "institution":
      return [m.chamber, institutionLabel(m.chamber)];
    case "period":
      return [row.period, row.period];
    case "component":
      return [row.component, DASHBOARD_COMPONENTS[row.component]];
    case "category":
      return [row.category, row.category];
    case "item":
      return [row.item, row.item];
    case "role":
      return [
        row.role ?? "no-aplica",
        row.role ?? "Sin cargo informado / no aplicable",
      ];
  }
}
export function groupExplorer(
  data: ExplorerData,
  q: ExplorerQuery,
  dimension = q.groupBy,
  supplied?: ExplorerFact[],
) {
  const members = new Map(data.members.map((m) => [m.id, m]));
  const rows = (supplied ?? filterExplorerFacts(data, q)).filter(
    (r) =>
      q.measure !== "amount" ||
      dimension === "component" ||
      r.component === q.metricComponent,
  );
  const buckets = new Map<
    string,
    { id: string; label: string; facts: ExplorerFact[]; memberIds: Set<string> }
  >();
  for (const r of rows) {
    const m = members.get(r.memberId);
    if (!m) continue;
    const [id, label] = explorerGroupKey(r, m, dimension);
    const g = buckets.get(id) ?? {
      id,
      label,
      facts: [],
      memberIds: new Set<string>(),
    };
    g.facts.push(r);
    g.memberIds.add(m.id);
    buckets.set(id, g);
  }
  return [...buckets.values()]
    .map((g) => {
      const known = g.facts.filter((r) => r.amount !== null),
        records = g.facts.reduce((s, r) => s + r.recordCount, 0);
      const value =
        q.measure === "amount"
          ? known.length
            ? known.reduce((s, r) => s + r.amount!, 0)
            : null
          : q.measure === "records"
            ? records
            : q.measure === "teams"
              ? new Set(
                  g.facts
                    .filter(
                      (r) => r.component === "personal" && r.recordCount > 0,
                    )
                    .map((r) => r.memberId),
                ).size
              : g.memberIds.size;
      const cohort = [...g.memberIds].map((id) => members.get(id)!);
      return {
        ...g,
        value,
        records,
        members: g.memberIds.size,
        deputies: cohort.filter((m) => m.chamber === "camara").length,
        senators: cohort.filter((m) => m.chamber === "senado").length,
        known: known.length,
        missing: g.facts.length - known.length,
      };
    })
    .sort((a, b) =>
      a.value === null
        ? b.value === null
          ? a.label.localeCompare(b.label, "es")
          : 1
        : b.value === null
          ? -1
          : (q.order === "asc" ? a.value - b.value : b.value - a.value) ||
            a.label.localeCompare(b.label, "es"),
    );
}
export function filterExplorerRecords(
  data: ExplorerData,
  q: ExplorerQuery,
  rows: ExplorerRecord[],
) {
  const ids = new Set(explorerMembers(data, q).map((m) => m.id));
  const active = q.componentIds?.length
    ? q.componentIds
    : q.component !== "todos"
      ? [q.component]
      : components;
  const term = normalizeExplorerText(q.query),
    members = new Map(data.members.map((m) => [m.id, m]));
  return rows.filter(
    (r) =>
      ids.has(r.memberId) &&
      r.period >= q.from &&
      r.period <= q.to &&
      active.includes(r.component) &&
      (q.category === "todas" || q.category === r.category) &&
      (q.item === "todos" || q.item === r.item) &&
      (!q.roles.length || (!!r.role && q.roles.includes(r.role))) &&
      (!term ||
        normalizeExplorerText(
          [
            r.providerName,
            r.serviceDescription,
            r.originalConcept,
            r.originalDescription,
            r.personName,
            r.originalRole,
            r.role,
            r.item,
            r.category,
            members.get(r.memberId)?.name,
          ].join(" "),
        ).includes(term)),
  );
}
export function matchingPartitions(data: ExplorerData, q: ExplorerQuery) {
  const chambers = new Set(explorerMembers(data, q).map((m) => m.chamber));
  return data.partitions.filter(
    (p) =>
      p.period >= q.from &&
      p.period <= q.to &&
      chambers.has(p.chamber) &&
      (!p.component ||
        (q.componentIds?.length
          ? q.componentIds
          : q.component !== "todos"
            ? [q.component]
            : components
        ).includes(p.component)),
  );
}
export function explorerCsv(
  data: ExplorerData,
  rows: readonly ExplorerFact[] | readonly ExplorerRecord[],
) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const members = new Map(data.members.map((m) => [m.id, m]));
  const header = [
    "Período",
    "Institución",
    "Parlamentario",
    "Partido vigente",
    "Región de representación",
    "Distrito",
    "Componente",
    "Categoría de lectura",
    "Ítem original",
    "Monto CLP",
    "Estado",
    "Registros administrativos",
    "Integrante publicado",
    "Cargo original",
    "Cargo normalizado",
    "ID registro",
    "ID fuente",
    "Fuente",
    "Alcance respaldo",
    "Captura individual",
    "Generación de proyección fuente",
    "Release",
    "Referencia dieta",
    "Oficina original de la fuente",
    "Prestador publicado",
    "Servicio publicado",
    "Concepto original",
    "Descripción original",
    "Campos originales",
    "Documentos asociados",
  ];
  return (
    "\uFEFF" +
    [
      header.map(cell).join(";"),
      ...rows.map((row) => {
        const r = row as ExplorerRecord,
          m = members.get(r.memberId);
        return [
          r.period,
          institutionLabel(m?.chamber ?? ""),
          m?.name,
          m?.partyLabel,
          m?.regionLabel,
          m?.district,
          DASHBOARD_COMPONENTS[r.component],
          r.category,
          r.item,
          r.amount,
          r.estimated
            ? "Referencia estimada"
            : r.amount === null
              ? "Sin información"
              : r.amount === 0
                ? "Cero informado"
                : "Monto informado",
          r.recordCount,
          r.personName,
          r.originalRole,
          r.role,
          r.id,
          r.sourceRecordId,
          r.sourceUrl,
          r.sourceScope,
          r.retrievedAt,
          r.sourceSnapshotAt,
          data.releaseId,
          r.referencePeriod,
          r.sourceOffice,
          r.providerName,
          r.serviceDescription,
          r.originalConcept,
          r.originalDescription,
          r.sourceFields ? JSON.stringify(r.sourceFields) : undefined,
          r.documentUrls?.join(" | "),
        ]
          .map((v, i) =>
            i === 9 && r.amount === null
              ? ""
              : typeof v === "number"
                ? String(v)
                : cell(v),
          )
          .join(";");
      }),
    ].join("\r\n")
  );
}
export function unpackExplorer(bootstrap: ExplorerBootstrap): ExplorerData {
  const { packedFacts, dictionaries, ...data } = bootstrap;
  const facts: ExplorerFact[] = packedFacts.map((r) => ({
    memberId: data.members[r[0]!].id,
    period: dictionaries.periods[r[1]!],
    component: components[r[2]!],
    category: dictionaries.categories[r[3]!],
    item: dictionaries.items[r[4]!],
    role: r[5] === null ? undefined : dictionaries.roles[r[5]!],
    amount: r[6],
    recordCount: r[7]!,
    ...(r[8] == null ? {} : { referencePeriod: dictionaries.periods[r[8]!] }),
    ...(r[9] === 1 ? { estimated: true } : {}),
    ...(r[10] == null ? {} : { contracts: r[10] }),
  }));
  return { ...data, facts };
}
export function packExplorer(data: ExplorerData): ExplorerBootstrap {
  const dictionary = (v: string[]) => [...new Set(v)].sort();
  const dictionaries = {
    periods: dictionary(
      data.facts.flatMap((r) =>
        r.referencePeriod ? [r.period, r.referencePeriod] : [r.period],
      ),
    ),
    categories: dictionary(data.facts.map((r) => r.category)),
    items: dictionary(data.facts.map((r) => r.item)),
    roles: dictionary(data.facts.flatMap((r) => (r.role ? [r.role] : []))),
  };
  const indices = Object.fromEntries(
    Object.entries(dictionaries).map(([k, v]) => [
      k,
      new Map(v.map((s, i) => [s, i])),
    ]),
  ) as Record<keyof typeof dictionaries, Map<string, number>>;
  const members = new Map(data.members.map((m, i) => [m.id, i]));
  const packedFacts = data.facts.map((r) => {
    const tuple: (number | null)[] = [
      members.get(r.memberId)!,
      indices.periods.get(r.period)!,
      components.indexOf(r.component),
      indices.categories.get(r.category)!,
      indices.items.get(r.item)!,
      r.role ? indices.roles.get(r.role)! : null,
      r.amount,
      r.recordCount,
    ];
    if (r.referencePeriod || r.estimated || r.contracts !== undefined)
      tuple.push(
        r.referencePeriod ? indices.periods.get(r.referencePeriod)! : null,
        r.estimated ? 1 : 0,
        r.contracts ?? null,
      );
    return tuple;
  });
  const { facts: _facts, ...rest } = data;
  void _facts;
  return { ...rest, dictionaries, packedFacts };
}
export function memberLabel(m: ExplorerMember) {
  return dashboardSurname(m.name).label;
}

/** One row per displayed analytical group, independent of UI pagination. */
export function explorerGroupCsv(data: ExplorerData, q: ExplorerQuery) {
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
    return '\"' + s.replaceAll('\"', '\"\"') + '\"';
  };
  const header = [
    DIMENSIONS[q.groupBy],
    MEASURES[q.measure],
    "Componente analizado",
    "Desde",
    "Hasta",
    "Registros administrativos",
    "Parlamentarios",
    "Estado",
    "Release",
  ];
  return (
    "\uFEFF" +
    [
      header.map(cell).join(";"),
      ...groupExplorer(data, q).map((g) =>
        [
          g.label,
          g.value,
          q.groupBy === "component"
            ? g.label
            : DASHBOARD_COMPONENTS[q.metricComponent],
          q.from,
          q.to,
          g.records,
          g.members,
          g.value === null
            ? "Sin información"
            : g.value === 0
              ? "Cero informado"
              : "Informado",
          data.releaseId,
        ]
          .map((v, i) =>
            i === 1 && g.value === null
              ? ""
              : typeof v === "number"
                ? String(v)
                : cell(v),
          )
          .join(";"),
      ),
    ].join("\r\n")
  );
}

export function explorerComponentAvailability(
  data: ExplorerData,
  q: ExplorerQuery,
  component: DashboardComponent,
  amount: number | null,
): "available" | "filtered" | "not-applicable" | "missing" {
  const active = q.componentIds?.length
    ? q.componentIds
    : q.component !== "todos"
      ? [q.component]
      : components;
  if (!active.includes(component)) return "filtered";
  if (q.roles.length && component !== "personal") return "not-applicable";
  if (
    q.category !== "todas" &&
    !data.facts.some(
      (r) => r.component === component && r.category === q.category,
    ) &&
    !(component === "dieta" && q.category === "Dieta referencial fija")
  )
    return "not-applicable";
  if (
    q.item !== "todos" &&
    !data.facts.some((r) => r.component === component && r.item === q.item) &&
    !(component === "dieta" && q.item === "Referencia mensual fija")
  )
    return "not-applicable";
  return amount === null ? "missing" : "available";
}
