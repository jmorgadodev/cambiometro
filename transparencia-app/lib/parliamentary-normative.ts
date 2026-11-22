import catalog from "../data/normativa/catalogo.json";
export const NORMATIVE_CATALOG = catalog;
export const normativeKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
/** Exact source glosas only; reading categories never inherit a single item's restrictions. */
const mappings: Record<string, string> = {
  "RELATIVO A COMUNICACION": "comunicacion",
  DIFUSION: "comunicacion",
  "RELATIVO A ACTIVIDAD TERRITORIAL": "territorial",
  "ACTIVIDADES DESTINADAS A LA INTERACCION CON LA COMUNIDAD": "territorial",
  "RELATIVO A ALOJAMIENTO Y ALIMENTACION": "alojamiento",
  "RELATIVO A DESPLAZAMIENTO": "desplazamientos",
  TRASLACION: "desplazamientos",
  "TRASLACION VEHICULO": "vehiculos",
  "COMBUSTIBLE HH SS": "vehiculos",
  "TELEFONIA CELULAR": "telefonia",
  "ARRIENDO DE INMUEBLE": "oficinas",
  "ARRIENDO DE OFICINA MOVIL": "oficinas",
  "ARRIENDO OFICINAS": "oficinas",
  "ARRIENDO DE OFICINAS VIRTUALES": "oficinas",
  "ARRIENDO OFICINAS VIRTUALES": "oficinas",
  "CONSUMOS BASICOS": "oficinas",
  "EQUIPAMIENTO OFICINA PARLAMENTARIA": "oficinas",
  "GASTOS DE MANTENCION OFICINA PARLAMENTARIA INMUEBLE": "oficinas",
  "HABILITACION DE OFICINA": "oficinas",
  "HABILITACION DE SEDES PARLAMENTARIAS CON AUTORIZACION DE CRAP": "oficinas",
  "MATERIALES DE OFICINA": "oficinas",
  "OFICINA MOVIL": "oficinas",
  "OTROS GASTOS MANT OFIC PARLAMENTARIA": "oficinas",
  "REPARACIONES LOCATIVAS DEL INMUEBLE": "oficinas",
  "REPARACIONES LOCATIVAS INMUEBLES": "oficinas",
  "SEGURO BIENES OFIC PARLAMENTARIAS": "oficinas",
};
export interface NormativeQuery {
  items?: readonly string[];
  component?: string;
  conceptIds?: readonly string[];
  chamber?: string;
  from?: string;
  to?: string;
}
export function normativeConceptIds(q: NormativeQuery) {
  if (q.conceptIds)
    return [...new Set(q.conceptIds)].filter((id) =>
      catalog.definitions.some((d) => d.id === id),
    );
  if (q.component === "dieta") return [];
  if (q.component === "personal" || q.component === "asesorias")
    return [q.component];
  return [
    ...new Set(
      (q.items ?? []).map((i) => mappings[normativeKey(i)]).filter(Boolean),
    ),
  ]
    .concat(q.component === "gastos" ? ["general"] : [])
    .filter((v, i, a) => a.indexOf(v) === i);
}
export function normativeVersions(from?: string, to?: string) {
  if (!from) return catalog.versions;
  const valid = (value: string) => {
    if (!/^\d{4}-(0[1-9]|1[0-2])(?:-(0[1-9]|[12]\d|3[01]))?$/.test(value))
      return false;
    if (value.length === 7) return true;
    const date = new Date(value + "T00:00:00Z");
    return (
      !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value
    );
  };
  if (!valid(from) || (to && !valid(to))) return [];
  const start = from.length === 7 ? from + "-01" : from;
  const end = to
    ? to.length === 7
      ? to +
        "-" +
        new Date(Number(to.slice(0, 4)), Number(to.slice(5)), 0).getDate()
      : to
    : start;
  return catalog.versions.filter(
    (v) => v.validFrom <= end && (!v.validTo || v.validTo >= start),
  );
}
export function normativeDefinitions(q: NormativeQuery) {
  const ids = normativeConceptIds(q),
    versions = normativeVersions(q.from, q.to ?? q.from).map((v) => v.id);
  return catalog.definitions.filter(
    (d) =>
      ids.includes(d.id) &&
      versions.includes(d.versionId) &&
      ((q.chamber !== "senado" && q.chamber !== "camara") ||
        d.institutions.includes(q.chamber)),
  );
}
export function normativeReference(
  definition: (typeof catalog.definitions)[number],
) {
  const v = catalog.versions.find((v) => v.id === definition.versionId)!;
  const r = definition.references.find((r) => r.versionId === v.id)!;
  return {
    ...v,
    section: r.section,
    page: r.page,
    url: v.url + "#page=" + r.page,
  };
}
