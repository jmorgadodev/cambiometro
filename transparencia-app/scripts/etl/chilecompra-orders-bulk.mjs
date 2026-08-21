const PUBLISHED_STATES = new Set([
  "enviada a proveedor",
  "en proceso",
  "aceptada",
  "solicitud de cancelacion",
  "recepcion conforme",
]);

export function hasExactOfficialOrderSchema(row, headers) {
  if (!row || !Array.isArray(headers) || headers.length === 0) return false;
  const keys = Object.keys(row);
  return keys.length === headers.length && headers.every((header) => Object.hasOwn(row, header));
}

export function shouldPublishOfficialMonth(orderCount) {
  return Number.isSafeInteger(orderCount) && orderCount > 0;
}

function cleanText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/\0/g, "").replace(/\s+/g, " ").trim();
  return text || null;
}

function comparable(value) {
  return cleanText(value)?.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() ?? "";
}

function validRut(value) {
  const text = cleanText(value);
  if (!text) return null;
  const compact = text.replace(/[^0-9kK]/g, "").toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(compact)) return null;
  const body = compact.slice(0, -1);
  let factor = 2;
  let sum = 0;
  for (let index = body.length - 1; index >= 0; index -= 1) {
    sum += Number(body[index]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const remainder = 11 - (sum % 11);
  const expected = remainder === 11 ? "0" : remainder === 10 ? "K" : String(remainder);
  return expected === compact.at(-1) ? text : null;
}

function legalEntityId(rut) {
  const compact = String(rut ?? "").replace(/[^0-9kK]/g, "").toLowerCase();
  return compact ? `legal-cl-${compact}` : null;
}

function officialDate(value) {
  const text = cleanText(value);
  if (!text) return null;
  const iso = text.match(/^(\d{4}-\d{2}-\d{2})/u)?.[1] ?? null;
  if (!iso || Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) return null;
  return iso;
}

function procurementType(value) {
  const text = comparable(value);
  if (text.includes("convenio marco")) return "convenio_marco";
  if (text.includes("trato directo")) return "trato_directo";
  if (text.includes("compra agil")) return "compra_agil";
  if (text.includes("licitacion")) return "licitacion";
  return null;
}

function clpAmount(row) {
  if (comparable(row.MonedaOC) !== "clp") return null;
  const value = Number(String(row.MontoTotalOC ?? "").replace(",", "."));
  return Number.isFinite(value) ? Math.round(value) : null;
}

export function officialOrderFromRow(row, {
  sourceUrl,
  year = null,
  months = null,
  cutoff = null,
} = {}) {
  const code = cleanText(row?.codigoOC);
  const date = officialDate(row?.FechaEnvioOC);
  const status = cleanText(row?.EstadoOC);
  if (!code || !date || !status || !PUBLISHED_STATES.has(comparable(status))) return null;
  const rowYear = Number(date.slice(0, 4));
  const rowMonth = Number(date.slice(5, 7));
  if (year !== null && rowYear !== year) return null;
  if (months instanceof Set && !months.has(rowMonth)) return null;
  if (cutoff && date > cutoff) return null;

  const buyerRut = validRut(row.UnidadCompraRUT);
  const buyerName = cleanText(row.Institucion) ?? cleanText(row.UnidadCompra);
  const buyerId = cleanText(row.entCode)
    ? `CL-MP-${cleanText(row.entCode)}`
    : legalEntityId(buyerRut);
  if (!buyerId || !buyerName || !buyerRut) return null;

  const supplierRut = validRut(row.ProveedorRUT);
  const supplierName = cleanText(row.Proveedor);
  const supplier = supplierRut && supplierName ? {
    id: legalEntityId(supplierRut),
    name: supplierName,
    legal_name: supplierName,
    rut_juridico: supplierRut,
  } : null;

  return {
    code,
    date,
    period: date.slice(0, 7),
    title: cleanText(row.NombreOC),
    description: cleanText(row.DescripcionOC),
    status,
    procurementType: procurementType(row.ProcedenciaOC),
    amountClp: clpAmount(row),
    buyer: {
      id: buyerId,
      name: cleanText(row.UnidadCompra) ?? buyerName,
      legal_name: buyerName,
      rut_juridico: buyerRut,
    },
    supplier,
    sourceUrl: cleanText(sourceUrl),
  };
}

export function mergeOfficialOrderRow(orders, row, options) {
  const order = officialOrderFromRow(row, options);
  if (!order) return null;
  const previous = orders.get(order.code);
  if (!previous) {
    orders.set(order.code, order);
    return order;
  }
  const identity = JSON.stringify([
    order.date,
    order.status,
    order.amountClp,
    order.buyer.rut_juridico,
    order.supplier?.rut_juridico ?? null,
  ]);
  const previousIdentity = JSON.stringify([
    previous.date,
    previous.status,
    previous.amountClp,
    previous.buyer.rut_juridico,
    previous.supplier?.rut_juridico ?? null,
  ]);
  if (identity !== previousIdentity) throw new Error(`CHILECOMPRA_ORDER_COLLISION:${order.code}`);
  return previous;
}

export function canonicalRecordsForOfficialOrder(order) {
  const ocid = `ocds-70d2nz-${order.code}`;
  const subjectId = legalEntityId(order.buyer.rut_juridico);
  const supplierIds = order.supplier ? [order.supplier.id] : [];
  const shared = {
    fecha: order.date,
    period: order.period,
    procurement_type: order.procurementType,
    ocid,
    process_id: order.code,
    title: order.title,
    description: order.description,
    status: order.status,
    status_detail: order.status,
    procurement_method: order.procurementType === "licitacion" ? "open" : "direct",
    procurement_method_rationale: null,
    buyer: order.buyer,
    documents: [],
    url: order.sourceUrl,
    fuente: "ChileCompra · Órdenes de compra oficiales",
    source_period: order.period,
  };
  return [
    {
      id: `chilecompra-${ocid}-tender`,
      kind: "purchase",
      occurredAt: `${order.date}T00:00:00Z`,
      sourceId: "chilecompra",
      evidence: { sourceUrl: order.sourceUrl },
      data: {
        ...shared,
        id: `${ocid}-tender`,
        kind: "purchase",
        stage: "tender",
        suppliers: [],
        items: [],
        monto_clp: null,
        monto_original: null,
        subject_entity_ids: [subjectId],
        object_entity_ids: [],
      },
    },
    {
      id: `chilecompra-${ocid}-award-order`,
      kind: "contract",
      occurredAt: `${order.date}T00:00:00Z`,
      sourceId: "chilecompra",
      evidence: { sourceUrl: order.sourceUrl },
      data: {
        ...shared,
        id: `${ocid}-award-order`,
        kind: "contract",
        stage: "award",
        award_id: `order-${order.code}`,
        suppliers: order.supplier ? [order.supplier] : [],
        items: [],
        monto_clp: order.amountClp,
        monto_original: order.amountClp === null ? null : {
          amount: String(order.amountClp),
          currency: "CLP",
          unit: "currency_unit",
        },
        subject_entity_ids: [subjectId],
        object_entity_ids: supplierIds,
      },
    },
  ];
}
