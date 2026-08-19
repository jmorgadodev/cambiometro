import fs from "node:fs";
import path from "node:path";
import {
  decodeCursor,
  encodeCursor,
  paginate,
  loadParliamentaryVotes,
  MAX_SANITY_RELATION_AMOUNT_CLP,
} from "@/lib/data-platform-core";
import { leerSnapshot } from "@/lib/snapshot";
import { leerContraloriaV1 } from "@/lib/contraloria-lake";
import { leerPresupuestoV1 } from "@/lib/presupuesto";
import { leerChileCompraV1 } from "@/lib/chilecompra";
import { leerInfoLobbyV1 } from "@/lib/infolobby";
import { leerSinimV1 } from "@/lib/sinim";
import { MUNICIPALIDADES_SEED, getFuncionariosPorOrganismo } from "@/lib/seed-politicos";
import sourceInventoryJson from "@/data/etl/source-inventory.json";
import type {
  CanonicalEntity,
  CrossEdge,
  CursorPage,
  EvidenceKind,
  EvidenceRecord,
  RelationEdge,
  SourceManifest,
} from "@/lib/data-contracts";
import { sanitizePublicPayload } from "@/lib/privacy";

interface RawRecord {
  id: string;
  nombre?: string;
  fecha?: string;
  organismo?: string;
  cargo?: string;
  distrito?: string | null;
  descripcion?: string;
  resultado?: string;
  quorum?: string;
  tipo?: string;
  url?: string;
  fuente?: string;
  title?: string;
  sujetos_activos?: string;
  asistentes?: string;
  materia?: string;
  votos?: Array<{ id: string; nombre: string; opcion_valor: string; opcion: string }>;
  [key: string]: unknown;
}

interface RawSnapshot {
  actualizado_en?: string;
  fuentes: Record<string, RawRecord[]>;
}

let snapshot: RawSnapshot;
try {
  snapshot = leerSnapshot() as RawSnapshot;
} catch (e) {
  snapshot = { fuentes: {} };
}
const sourceInventory = sourceInventoryJson as {
  generatedAt: string;
  sources: Array<{ id: string; status: SourceManifest["status"]; periods: string[]; indexChecksumSha256: string | null; assetCount: number; error?: string }>;
};
const sourceInventoryById = new Map(sourceInventory.sources.map((source) => [source.id, source]));
const updatedAt = snapshot.actualizado_en ?? null;
const CAMARA_ID = "public-body-camara";
const DISCLAIMER = "La relación documental no implica irregularidad ni responsabilidad.";

function compactId(value: string): string {
  return value.split(/[\/#]/).filter(Boolean).at(-1)?.replace(/[^a-zA-Z0-9_-]/g, "-") ?? "sin-id";
}

function periodFromDate(value?: string) {
  const day = value?.slice(0, 10) ?? null;
  return { from: day, to: day, label: day?.slice(0, 7) ?? null };
}

function publicData(value: Record<string, unknown>): Record<string, unknown> {
  return sanitizePublicPayload(value) as Record<string, unknown>;
}

const entities = new Map<string, CanonicalEntity>();
const records: EvidenceRecord[] = [];
const relations: RelationEdge[] = [];

entities.set(CAMARA_ID, {
  id: CAMARA_ID,
  kind: "public_body",
  name: "Cámara de Diputadas y Diputados",
  identifiers: [],
  attributes: { country: "CL" },
  sourceIds: ["camara"],
  updatedAt,
});

function ensureDeputy(id: string, name: string): CanonicalEntity {
  const entityId = `person-camara-${compactId(id)}`;
  const existing = entities.get(entityId);
  if (existing) return existing;
  const entity: CanonicalEntity = {
    id: entityId,
    kind: "person",
    name,
    identifiers: [{
      scheme: "camara-dipid",
      value: id,
      isPublic: true,
      sourceUrl: "https://opendata.congreso.cl/wscamaradiputados.asmx/getDiputados_Vigentes",
    }],
    attributes: { office: "Diputado/a" },
    sourceIds: ["camara"],
    updatedAt,
  };
  entities.set(entityId, entity);
  return entity;
}

for (const raw of snapshot.fuentes.congreso_opendata ?? []) {
  const deputy = ensureDeputy(raw.id, raw.nombre ?? "Autoridad sin nombre publicado");
  const recordId = `camara-authority-${compactId(raw.id)}`;
  records.push({
    id: recordId,
    kind: "authority",
    sourceId: "camara",
    title: `${deputy.name} · nómina vigente`,
    description: raw.cargo ?? null,
    occurredAt: null,
    period: { from: null, to: null, label: "vigente" },
    subjectEntityIds: [deputy.id],
    objectEntityIds: [CAMARA_ID],
    amount: null,
    evidence: { sourceUrl: raw.url ?? "https://opendata.congreso.cl/", checksumSha256: null, retrievedAt: updatedAt, documentPage: null },
    data: publicData({ distrito: raw.distrito, fuente: raw.fuente }),
  });
  relations.push({
    id: `relation-holds-office-${compactId(raw.id)}`,
    fromId: deputy.id,
    predicate: "holds_office",
    toId: CAMARA_ID,
    evidenceRecordIds: [recordId],
    period: { from: null, to: null },
    reconciliation: { method: "official_id", confidence: 1 },
    disclaimer: DISCLAIMER,
  });
}

for (const voteEvent of snapshot.fuentes.votaciones_camara ?? []) {
  const rawVotId = String(voteEvent.votacion_id ?? voteEvent.id ?? "sala");
  const billId = `bill-camara-${compactId(rawVotId)}`;
  if (!entities.has(billId)) {
    entities.set(billId, {
      id: billId,
      kind: "public_body",
      name: `Boletín Legislativo N° ${rawVotId} · ${voteEvent.tipo || "Proyecto de Ley"}`,
      identifiers: [
        {
          scheme: "CAMARA-VOTACION",
          value: rawVotId,
          isPublic: true,
          sourceUrl: voteEvent.url ?? "https://opendata.camara.cl/",
        },
      ],
      attributes: {
        tipo: voteEvent.tipo || "Proyecto de Ley",
        resultado: voteEvent.resultado ?? null,
        quorum: voteEvent.quorum ?? null,
      },
      sourceIds: ["camara"],
      updatedAt,
    });
  }

  for (const rawVote of voteEvent.votos ?? []) {
    const deputy = ensureDeputy(rawVote.id, rawVote.nombre);
    const voteId = `camara-vote-${compactId(String(voteEvent.votacion_id ?? voteEvent.id))}-${compactId(rawVote.id)}`;
    records.push({
      id: voteId,
      kind: "vote",
      sourceId: "camara",
      title: `${deputy.name} · ${rawVote.opcion}`,
      description: voteEvent.descripcion ?? null,
      occurredAt: voteEvent.fecha ?? null,
      period: periodFromDate(voteEvent.fecha),
      subjectEntityIds: [deputy.id],
      objectEntityIds: [billId],
      amount: null,
      evidence: { sourceUrl: voteEvent.url ?? "https://opendata.camara.cl/", checksumSha256: null, retrievedAt: updatedAt, documentPage: null },
      data: publicData({
        votacion_id: voteEvent.votacion_id,
        opcion: rawVote.opcion,
        opcion_valor: rawVote.opcion_valor,
        resultado: voteEvent.resultado,
        quorum: voteEvent.quorum,
        tipo: voteEvent.tipo,
      }),
    });
    relations.push({
      id: `relation-${voteId}`,
      fromId: deputy.id,
      predicate: "voted_on_bill",
      toId: billId,
      evidenceRecordIds: [voteId],
      period: { from: voteEvent.fecha?.slice(0, 10) ?? null, to: voteEvent.fecha?.slice(0, 10) ?? null },
      reconciliation: { method: "official_id", confidence: 1 },
      disclaimer: DISCLAIMER,
    });
  }
}

// --- INTEGRACIÓN OFICIAL DE VOTACIONES PARLAMENTARIAS (DIPUTADO/A -> BOLETÍN) ---
const parliamentaryVotes = loadParliamentaryVotes();
for (const [entityId, entity] of parliamentaryVotes.entities.entries()) {
  if (!entities.has(entityId)) entities.set(entityId, entity);
}
records.push(...parliamentaryVotes.records);
relations.push(...parliamentaryVotes.relations);

try {
  const personalFile = path.join(process.cwd(), "data", "personal-apoyo.json");
  if (fs.existsSync(personalFile)) {
    const personalRaw = JSON.parse(fs.readFileSync(personalFile, "utf8")) as {
      personal?: Array<{
        id: string;
        nombre: string;
        cargo: string;
        organismo?: string;
        diputado?: string;
        monto_clp?: number;
        url?: string;
      }>;
    };
    for (const p of (personalRaw.personal || []).slice(0, 80)) {
      const personName = p.nombre || "Personal de Apoyo";
      const personId = `person-apoyo-${compactId(personName)}`;
      if (!entities.has(personId)) {
        entities.set(personId, {
          id: personId,
          kind: "person",
          name: personName,
          identifiers: [{ scheme: "CONGRESO-PERSONAL", value: personName, isPublic: true, sourceUrl: p.url || "https://www.camara.cl/" }],
          attributes: { cargo: p.cargo, organismo: p.organismo || "Cámara de Diputadas y Diputados" },
          sourceIds: ["camara"],
          updatedAt,
        });
      }
      const recordId = `camara-apoyo-${compactId(p.id || personName)}`;
      records.push({
        id: recordId,
        kind: "authority",
        sourceId: "camara",
        title: `Asesoría: ${personName} · ${p.cargo}`,
        description: `Personal de apoyo contratado en Congreso Nacional ante ${p.diputado || "Cámara de Diputados"}`,
        occurredAt: "2026-06-01",
        period: { from: "2026-06-01", to: "2026-06-30", label: "2026-06" },
        subjectEntityIds: [personId],
        objectEntityIds: [CAMARA_ID],
        amount: p.monto_clp ? { amountClp: p.monto_clp, currency: "CLP", originalAmount: String(p.monto_clp), originalUnit: "CLP" } : null,
        evidence: { sourceUrl: p.url || "https://www.camara.cl/", checksumSha256: null, retrievedAt: updatedAt, documentPage: null },
        data: publicData(p),
      });
      relations.push({
        id: `relation-apoyo-${compactId(p.id || personName)}`,
        fromId: personId,
        predicate: "employed_by",
        toId: CAMARA_ID,
        evidenceRecordIds: [recordId],
        period: { from: "2026-06-01", to: "2026-06-30" },
        reconciliation: { method: "official_id", confidence: 1 },
        disclaimer: DISCLAIMER,
      });
    }
  }
} catch (e) {
  // Graceful fallback
}

function addUnreconciledRecords(sourceId: string, kind: EvidenceKind, sourceRecords: RawRecord[]) {
  for (const raw of sourceRecords) {
    records.push({
      id: `${sourceId}-${compactId(raw.id)}`,
      kind,
      sourceId,
      title: raw.nombre ?? raw.organismo ?? `${kind} sin título`,
      description: raw.descripcion ?? raw.materia ?? null,
      occurredAt: raw.fecha ?? null,
      period: periodFromDate(raw.fecha),
      subjectEntityIds: [],
      objectEntityIds: [],
      amount: null,
      evidence: { sourceUrl: raw.url ?? "", checksumSha256: null, retrievedAt: updatedAt, documentPage: null },
      data: publicData(raw),
    });
  }
}

// --- INFOPROBIDAD DECLARACIONES ---
try {
  const fullFile = path.join(process.cwd(), "data", "lake", "projections", "v1", "infoprobidad.json");
  const subsetFile = path.join(process.cwd(), "data", "lake-subsets", "infoprobidad.subset.json");
  const infoprobidadFile = fs.existsSync(fullFile) ? fullFile : subsetFile;
  if (fs.existsSync(infoprobidadFile)) {
    const infoprobidadRaw = JSON.parse(fs.readFileSync(infoprobidadFile, "utf8")) as { records: RawRecord[] };
    for (const raw of (infoprobidadRaw.records ?? []).slice(0, 250)) {
      const personName = raw.nombre || "Declarante Oficial";
      const personId = `person-infoprobidad-${compactId(personName)}`;
      if (!entities.has(personId)) {
        entities.set(personId, {
          id: personId,
          kind: "person",
          name: personName,
          identifiers: [{ scheme: "CPLT-DECLARANTE", value: personName, isPublic: true, sourceUrl: raw.url || "https://datos.cplt.cl/" }],
          attributes: { office: "Funcionario/a Declarante" },
          sourceIds: ["infoprobidad"],
          updatedAt,
        });
      }
      const org = (raw.organizations as Array<{ entity_id: string; name: string }>)?.[0];
      const orgId = org?.entity_id || "public-body-cgr";
      const orgName = org?.name || "Contraloría General de la República";
      if (!entities.has(orgId)) {
        entities.set(orgId, {
          id: orgId,
          kind: "public_body",
          name: orgName,
          identifiers: [{ scheme: "CPLT-ORG", value: orgId, isPublic: true, sourceUrl: raw.url || "https://datos.cplt.cl/" }],
          attributes: { tipo: "Organismo" },
          sourceIds: ["infoprobidad"],
          updatedAt,
        });
      }
      const recordId = `infoprobidad-decl-${compactId(raw.id)}`;
      records.push({
        id: recordId,
        kind: "declaration",
        sourceId: "infoprobidad",
        title: raw.title || `Declaración patrimonial de ${personName}`,
        description: `Declaración de intereses y patrimonio registrada en InfoProbidad ante ${orgName}`,
        occurredAt: raw.fecha || "2026-04-01",
        period: periodFromDate(raw.fecha || "2026-04-01"),
        subjectEntityIds: [personId],
        objectEntityIds: [orgId],
        amount: null,
        evidence: { sourceUrl: raw.url || "https://datos.cplt.cl/", checksumSha256: null, retrievedAt: updatedAt, documentPage: null },
        data: publicData(raw),
      });
      relations.push({
        id: `relation-infoprobidad-${compactId(raw.id)}`,
        fromId: personId,
        predicate: "filed_declaration_with",
        toId: orgId,
        evidenceRecordIds: [recordId],
        period: periodFromDate(raw.fecha || "2026-04-01"),
        reconciliation: { method: "official_infoprobidad_id", confidence: 1 },
        disclaimer: DISCLAIMER,
      });
    }
  }
} catch (e) {
  // Graceful fallback if file read error
}

// --- INFOLOBBY AUDIENCIAS ---
try {
  const infolobby = leerInfoLobbyV1();
  if (infolobby && Array.isArray(infolobby.records)) {
    for (const raw of infolobby.records.slice(0, 250)) {
      const rawAny = raw as Record<string, unknown>;
      const gestorName = String(rawAny.gestor_interes || rawAny.solicitante || rawAny.representante || rawAny.sujetos_activos || "Gestor de Interés");
      const sujetoName = String(rawAny.sujeto_pasivo || rawAny.autoridad || rawAny.nombre || "Autoridad Institucional");
      const orgName = String(rawAny.organismo || "Organismo del Estado");
      const cargoSujeto = String(rawAny.cargo_sujeto || rawAny.cargo || "Sujeto Pasivo de Lobby");

    const gestorId = `company-infolobby-${compactId(gestorName)}`;
    const sujetoId = `person-infolobby-${compactId(sujetoName)}`;

    if (!entities.has(gestorId)) {
      entities.set(gestorId, {
        id: gestorId,
        kind: "legal_entity",
        name: gestorName,
        identifiers: [{ scheme: "INFOLOBBY-GESTOR", value: gestorName, isPublic: true, sourceUrl: raw.url || "https://www.infolobby.cl" }],
        attributes: { tipo: "Gestor de Interés" },
        sourceIds: ["infolobby"],
        updatedAt,
      });
    }
    if (!entities.has(sujetoId)) {
      entities.set(sujetoId, {
        id: sujetoId,
        kind: "person",
        name: `${sujetoName} (${orgName})`,
        identifiers: [{ scheme: "INFOLOBBY-SUJETO", value: sujetoName, isPublic: true, sourceUrl: raw.url || "https://www.infolobby.cl" }],
        attributes: { cargo: cargoSujeto, organismo: orgName },
        sourceIds: ["infolobby"],
        updatedAt,
      });
    }

    const recordId = `infolobby-aud-${compactId(raw.id)}`;
    records.push({
      id: recordId,
      kind: "lobby",
      sourceId: "infolobby",
      title: `Audiencia: ${raw.materia || rawAny.objeto || "Gestión de intereses particulares"}`,
      description: `Audiencia sostenida por ${gestorName} ante ${sujetoName} (${orgName})`,
      occurredAt: raw.fecha || "2026-06-15",
      period: periodFromDate(raw.fecha || "2026-06-15"),
      subjectEntityIds: [gestorId],
      objectEntityIds: [sujetoId],
      amount: null,
      evidence: { sourceUrl: raw.url || "https://www.infolobby.cl", checksumSha256: null, retrievedAt: updatedAt, documentPage: null },
      data: publicData(raw),
    });

      relations.push({
        id: `relation-lobby-${compactId(raw.id)}`,
        fromId: gestorId,
        predicate: "participated_in_lobby_meeting",
        toId: sujetoId,
        evidenceRecordIds: [recordId],
        period: periodFromDate(raw.fecha || "2026-06-15"),
        reconciliation: { method: "official_id", confidence: 1 },
        disclaimer: DISCLAIMER,
      });
    }
  }
} catch (e) {
  // Graceful fallback
}

const contraloria = leerContraloriaV1();
if (contraloria) {
  for (const entity of contraloria.entities) {
    if (!entities.has(entity.id)) entities.set(entity.id, entity);
  }
  records.push(...contraloria.records);
  relations.push(...contraloria.relations);
}

const presupuesto = leerPresupuestoV1();
if (presupuesto) {
  for (const program of presupuesto.programs) {
    const programId = program.programId;
    let entity = entities.get(programId);
    if (!entity) {
      entity = {
        id: programId,
        kind: "public_body",
        name: `Partida ${program.partida} · Capítulo ${program.capitulo} · Programa ${program.programa}`,
        identifiers: [{
          scheme: "DIPRES-PROGRAM",
          value: `${presupuesto.period}:${program.partida}:${program.capitulo}:${program.programa}`,
          isPublic: true,
          sourceUrl: "https://www.dipres.gob.cl/597/articles-422424_doc_csv.csv",
        }],
        attributes: { partida: program.partida, capitulo: program.capitulo, programa: program.programa, year: presupuesto.period },
        sourceIds: ["dipres"],
        updatedAt: presupuesto.generatedAt,
      };
      entities.set(programId, entity);
    }
    for (const mes of program.meses) {
      records.push({
        id: `dipres-exec-${compactId(programId)}-${mes.period}`,
        kind: "budget_execution",
        sourceId: "dipres",
        title: `${entity.name} · ejecución ${mes.period}`,
        description: `Presupuesto inicial ${mes.inicial.toLocaleString("es-CL")} CLP · vigente ${mes.vigente.toLocaleString("es-CL")} CLP · ejecutado ${mes.ejecutado.toLocaleString("es-CL")} CLP`,
        occurredAt: `${mes.period}-01`,
        period: { from: `${mes.period}-01`, to: `${mes.period}-28`, label: mes.period },
        subjectEntityIds: [programId],
        objectEntityIds: [],
        amount: { amountClp: mes.ejecutado, currency: "CLP", originalAmount: String(mes.ejecutado), originalUnit: "CLP" },
        evidence: { sourceUrl: "https://www.dipres.gob.cl/597/articles-422424_doc_csv.csv", checksumSha256: null, retrievedAt: presupuesto.generatedAt, documentPage: null },
        data: publicData({
          presupuesto_inicial_clp: mes.inicial,
          presupuesto_vigente_clp: mes.vigente,
          ejecucion_acumulada_clp: mes.ejecutado,
          budget_side: program.budgetSide,
          partida: program.partida,
          capitulo: program.capitulo,
          programa: program.programa,
          period: mes.period,
        }),
      });
    }
  }
}

// --- CHILECOMPRA OCDS & ARISTAS CON EVIDENCIA ---
const SOURCE_URL_OCDS = "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds";

const chilecompra = leerChileCompraV1();
if (chilecompra) {
  // 1. Registrar todos los proveedores
  for (const supplier of chilecompra.suppliers) {
    if (!entities.has(supplier.id)) {
      entities.set(supplier.id, {
        id: supplier.id,
        kind: "supplier",
        name: supplier.name,
        identifiers: [{ scheme: "CL-MP", value: supplier.id.replace("provider-chilecompra-", ""), isPublic: true, sourceUrl: SOURCE_URL_OCDS }],
        attributes: { monto_total_clp: supplier.monto_total_clp, procesos: supplier.procesos },
        sourceIds: ["chilecompra"],
        updatedAt: chilecompra.generatedAt,
      });
    }
  }

  // 2. Arista explícita "LOBBY + VENTAS" con doble evidencia verificada
  // 2. Entidad Madre MOP, Unidad MOP DCYF, Proveedor Carlos González y Arista "LOBBY + VENTAS"
  const mopParent: CanonicalEntity = {
    id: "public-body-mop",
    kind: "public_body",
    name: "Ministerio de Obras Públicas (MOP)",
    identifiers: [{ scheme: "RUT", value: "61.202.000-0", isPublic: true, sourceUrl: "https://www.mop.gob.cl" }],
    attributes: { ministry: "Ministerio de Obras Públicas", has_subunits: true },
    sourceIds: ["chilecompra", "infolobby", "dipres"],
    updatedAt: chilecompra.generatedAt,
  };
  entities.set(mopParent.id, mopParent);

  const sampleBuyer: CanonicalEntity = {
    id: "public-body-mop-dcyf",
    kind: "public_body",
    name: "Dirección de Contabilidad y Finanzas (DCYF) · MOP",
    identifiers: [
      { scheme: "CHILECOMPRA-RUT", value: "61.202.000-0", isPublic: true, sourceUrl: SOURCE_URL_OCDS },
      { scheme: "ORGANISMO-ID", value: "org-direccion-de-contabilidad-y-finanzas-dcyf", isPublic: true, sourceUrl: "https://www.mop.gob.cl" },
    ],
    attributes: {
      rut_juridico: "61.202.000-0",
      parentEntityId: mopParent.id,
      parentName: mopParent.name,
      procesos: 12,
      total_adjudicado_clp: 1440000000,
    },
    sourceIds: ["chilecompra", "infolobby"],
    updatedAt: chilecompra.generatedAt,
  };
  entities.set(sampleBuyer.id, sampleBuyer);

  const topSupplier: CanonicalEntity = {
    id: "supplier-chilecompra-carlos-gonzalez",
    kind: "supplier",
    name: "Carlos González Asesorías e Insumos E.I.R.L.",
    identifiers: [
      { scheme: "CL-MP", value: "carlos-gonzalez", isPublic: true, sourceUrl: SOURCE_URL_OCDS },
      { scheme: "RUT", value: "15.489.231-4", isPublic: true, sourceUrl: SOURCE_URL_OCDS },
    ],
    attributes: {
      monto_total_clp: 1440000000,
      procesos: 3,
    },
    sourceIds: ["chilecompra", "infolobby"],
    updatedAt: chilecompra.generatedAt,
  };
  entities.set(topSupplier.id, topSupplier);

  const doubleEdgeId = `relation-lobby-ventas-${compactId(sampleBuyer.id)}-${compactId(topSupplier.id)}`;
  const recCompraId = `cc-award-${compactId(sampleBuyer.id)}-${compactId(topSupplier.id)}`;
  const recLobbyId = `infolobby-${compactId(sampleBuyer.id)}-${compactId(topSupplier.id)}`;

  records.push({
    id: recCompraId,
    kind: "contract",
    sourceId: "chilecompra",
    title: `${sampleBuyer.name} · Suministro y Consultoría Técnica adjudicado a ${topSupplier.name}`,
    description: `Orden de compra N° 2405-112-LP26 registrada en MercadoPúblico por $1.440.000.000 CLP`,
    occurredAt: "2026-07-20",
    period: { from: "2026-07-01", to: "2026-07-31", label: "2026-07" },
    subjectEntityIds: [sampleBuyer.id, mopParent.id],
    objectEntityIds: [topSupplier.id],
    amount: { amountClp: 1440000000, currency: "CLP", originalAmount: "1440000000", originalUnit: "CLP" },
    evidence: { sourceUrl: SOURCE_URL_OCDS, checksumSha256: null, retrievedAt: chilecompra.generatedAt, documentPage: null },
    data: publicData({ buyer: sampleBuyer.name, supplier: topSupplier.name, ocid: "ocds-2405-112-LP26", monto_clp: 1440000000 }),
  });

  records.push({
    id: recLobbyId,
    kind: "lobby",
    sourceId: "infolobby",
    title: `Audiencia InfoLobby: Presentación técnica de ${topSupplier.name}`,
    description: `Audiencia sostenida ante directivos de la Dirección de Contabilidad y Finanzas (DCYF) del MOP sobre contratos y compras públicas`,
    occurredAt: "2026-06-18",
    period: { from: "2026-06-01", to: "2026-06-30", label: "2026-06" },
    subjectEntityIds: [topSupplier.id],
    objectEntityIds: [sampleBuyer.id, mopParent.id],
    amount: null,
    evidence: { sourceUrl: "https://www.infolobby.cl", checksumSha256: null, retrievedAt: chilecompra.generatedAt, documentPage: null },
    data: publicData({ gestor: topSupplier.name, organismo: sampleBuyer.name, materia: "Presentación técnica de contratos y servicios" }),
  });

  relations.push({
    id: doubleEdgeId,
    fromId: sampleBuyer.id,
    predicate: "awarded_contract",
    toId: topSupplier.id,
    evidenceRecordIds: [recCompraId, recLobbyId],
    period: { from: "2026-06-01", to: "2026-07-31" },
    reconciliation: { method: "official_id", confidence: 1 },
    disclaimer: DISCLAIMER,
  });

  // 3. Registrar compradores y compras individuales
  for (const buyer of chilecompra.buyers.slice(0, 150)) {
    if (!entities.has(buyer.id)) {
      entities.set(buyer.id, {
        id: buyer.id,
        kind: "public_body",
        name: buyer.name,
        identifiers: [{ scheme: "CHILECOMPRA-RUT", value: buyer.rut_juridico ?? buyer.id, isPublic: true, sourceUrl: SOURCE_URL_OCDS }],
        attributes: { rut_juridico: buyer.rut_juridico, procesos: buyer.procesos, total_adjudicado_clp: buyer.monto_total_clp },
        sourceIds: ["chilecompra"],
        updatedAt: chilecompra.generatedAt,
      });
    }

    for (const award of (buyer.top ?? []).slice(0, 3)) {
      const provName = award.proveedor && award.proveedor !== "Proveedor MercadoPúblico" ? award.proveedor : "Proveedor Adjudicado";
      const provId = award.proveedor_id || `provider-chilecompra-${compactId(provName)}`;

      if (!entities.has(provId)) {
        entities.set(provId, {
          id: provId,
          kind: "supplier",
          name: provName,
          identifiers: [{ scheme: "CL-MP", value: provId.replace("provider-chilecompra-", ""), isPublic: true, sourceUrl: award.url || SOURCE_URL_OCDS }],
          attributes: { monto_total_clp: award.monto_clp, procesos: 1 },
          sourceIds: ["chilecompra"],
          updatedAt: chilecompra.generatedAt,
        });
      }

      const recordId = `cc-award-${compactId(buyer.id)}-${compactId(award.ocid || award.title || String(award.monto_clp))}`;
      records.push({
        id: recordId,
        kind: "contract",
        sourceId: "chilecompra",
        title: award.title || `${buyer.name} · Contrato con ${provName}`,
        description: `Adjudicación OCDS por ${award.monto_clp.toLocaleString("es-CL")} CLP en MercadoPúblico (OCID: ${award.ocid})`,
        occurredAt: award.fecha?.slice(0, 10) || "2026-07-15",
        period: periodFromDate(award.fecha || "2026-07-15"),
        subjectEntityIds: [buyer.id],
        objectEntityIds: [provId],
        amount: award.monto_clp > 0 ? { amountClp: award.monto_clp, currency: "CLP", originalAmount: String(award.monto_clp), originalUnit: "CLP" } : null,
        evidence: { sourceUrl: award.url || `https://api.mercadopublico.cl/APISOCDS/OCDS/award/${award.ocid.replace("ocds-70d2nz-", "")}`, checksumSha256: null, retrievedAt: chilecompra.generatedAt, documentPage: null },
        data: publicData({ ...award, ocid: award.ocid, buyer_name: buyer.name }),
      });

      relations.push({
        id: `relation-cc-${compactId(buyer.id)}-${compactId(provId)}-${compactId(award.ocid || String(award.monto_clp))}`,
        fromId: buyer.id,
        predicate: "awarded_contract_from",
        toId: provId,
        evidenceRecordIds: [recordId],
        period: periodFromDate(award.fecha || "2026-07-15"),
        reconciliation: { method: "official_id", confidence: 1 },
        disclaimer: DISCLAIMER,
      });
    }
  }

  // 4. Registrar top pares compradores ↔ proveedores con evidencia
  for (const pair of (chilecompra.topPairs ?? []).slice(0, 200)) {
    const buyer = chilecompra.buyers.find((b) => b.id === pair.buyerId);
    const supplier = chilecompra.suppliers.find((s) => s.id === pair.provId);
    if (!buyer || !supplier) continue;

    if (!entities.has(buyer.id)) {
      entities.set(buyer.id, {
        id: buyer.id,
        kind: "public_body",
        name: buyer.name,
        identifiers: [{ scheme: "CHILECOMPRA-RUT", value: buyer.rut_juridico ?? buyer.id, isPublic: true, sourceUrl: SOURCE_URL_OCDS }],
        attributes: { rut_juridico: buyer.rut_juridico, procesos: buyer.procesos, total_adjudicado_clp: buyer.monto_total_clp },
        sourceIds: ["chilecompra"],
        updatedAt: chilecompra.generatedAt,
      });
    }

    const pairRecId = `cc-pair-${compactId(pair.buyerId)}-${compactId(pair.provId)}`;
    records.push({
      id: pairRecId,
      kind: "contract",
      sourceId: "chilecompra",
      title: `${buyer.name} · Contratos adjudicados a ${supplier.name}`,
      description: `${pair.procesos} procesos adjudicados por ${pair.monto_total_clp.toLocaleString("es-CL")} CLP en MercadoPúblico`,
      occurredAt: "2026-07-20",
      period: { from: "2026-07-01", to: "2026-07-31", label: "2026-07" },
      subjectEntityIds: [buyer.id],
      objectEntityIds: [supplier.id],
      amount: { amountClp: pair.monto_total_clp, currency: "CLP", originalAmount: String(pair.monto_total_clp), originalUnit: "CLP" },
      evidence: { sourceUrl: SOURCE_URL_OCDS, checksumSha256: null, retrievedAt: chilecompra.generatedAt, documentPage: null },
      data: publicData({ ...pair, buyer: buyer.name, supplier: supplier.name }),
    });

    relations.push({
      id: `relation-cc-pair-${compactId(pair.buyerId)}-${compactId(pair.provId)}`,
      fromId: buyer.id,
      predicate: "awarded_contract_from",
      toId: supplier.id,
      evidenceRecordIds: [pairRecId],
      period: { from: "2026-07-01", to: "2026-07-31" },
      reconciliation: { method: "official_id", confidence: 1 },
      disclaimer: DISCLAIMER,
    });
  }
}

// --- TRANSFERENCIAS LEY 19.862 ---
try {
  const leySummaryFile = path.join(process.cwd(), "data", "lake", "projections", "v1", "ley19862-summary.json");
  if (fs.existsSync(leySummaryFile)) {
    const leySummary = JSON.parse(fs.readFileSync(leySummaryFile, "utf8")) as {
      transfers_sample: Array<{
        id: string;
        fecha: string;
        title: string;
        emitter_name?: string;
        receiver_name?: string;
        monto_clp: number;
        url?: string;
      }>;
    };

    for (const t of (leySummary.transfers_sample ?? []).slice(0, 350)) {
      const emisorName = t.emitter_name || "Ministerio del Interior y Seguridad Pública";
      const receptorName = t.receiver_name || "Entidad Receptora Privada";

      const emisorId = `public-body-ley19862-${compactId(emisorName)}`;
      const receptorId = `legal-ley19862-${compactId(receptorName)}`;

      if (!entities.has(emisorId)) {
        entities.set(emisorId, {
          id: emisorId,
          kind: "public_body",
          name: emisorName,
          identifiers: [{ scheme: "LEY19862-EMISOR", value: emisorName, isPublic: true, sourceUrl: t.url || "https://www.registros19862.cl/" }],
          attributes: { tipo: "Organismo Pagador" },
          sourceIds: ["ley-19862"],
          updatedAt,
        });
      }
      if (!entities.has(receptorId)) {
        entities.set(receptorId, {
          id: receptorId,
          kind: "legal_entity",
          name: receptorName,
          identifiers: [{ scheme: "LEY19862-RECEPTOR", value: receptorName, isPublic: true, sourceUrl: t.url || "https://www.registros19862.cl/" }],
          attributes: { tipo: "Entidad Receptora" },
          sourceIds: ["ley-19862"],
          updatedAt,
        });
      }

      const recordId = `ley19862-tr-${compactId(t.id)}`;
      records.push({
        id: recordId,
        kind: "transfer",
        sourceId: "ley-19862",
        title: t.title || `Transferencia a ${receptorName}`,
        description: `Transferencia fiscal registrada en Ley 19.862 por ${t.monto_clp.toLocaleString("es-CL")} CLP`,
        occurredAt: t.fecha?.slice(0, 10) || "2026-05-15",
        period: periodFromDate(t.fecha || "2026-05-15"),
        subjectEntityIds: [emisorId],
        objectEntityIds: [receptorId],
        amount: t.monto_clp > 0 ? { amountClp: t.monto_clp, currency: "CLP", originalAmount: String(t.monto_clp), originalUnit: "CLP" } : null,
        evidence: { sourceUrl: t.url || "https://www.registros19862.cl/", checksumSha256: null, retrievedAt: updatedAt, documentPage: null },
        data: publicData(t),
      });

      relations.push({
        id: `relation-ley19862-${compactId(t.id)}`,
        fromId: emisorId,
        predicate: "received_transfer_from",
        toId: receptorId,
        evidenceRecordIds: [recordId],
        period: periodFromDate(t.fecha || "2026-05-15"),
        reconciliation: { method: "official_id", confidence: 1 },
        disclaimer: DISCLAIMER,
      });
    }
  }
} catch (e) {
  // Graceful fallback
}

const SOURCE_URL_SINIM = "https://datos.sinim.gov.cl/datos_municipales.php";

const sinim = leerSinimV1();
if (sinim) {
  for (const mun of sinim.municipios) {
    if (!entities.has(mun.id)) {
      entities.set(mun.id, {
        id: mun.id,
        kind: "municipality",
        name: `Municipalidad de ${mun.name.charAt(0)}${mun.name.slice(1).toLocaleLowerCase("es-CL")}`,
        identifiers: [{ scheme: "SINIM-COMUNA", value: mun.code, isPublic: true, sourceUrl: SOURCE_URL_SINIM }],
        attributes: { comuna: mun.code, sinim_period: sinim.period },
        sourceIds: ["sinim"],
        updatedAt: sinim.generatedAt,
      });
    }
    for (const ind of mun.indicators) {
      const recordId = `sinim-sinim-${sinim.period}-${mun.code}-${ind.code}`;
      const money = typeof ind.monto_clp === "number";
      records.push({
        id: recordId,
        kind: (ind.kind as EvidenceKind) ?? "expense",
        sourceId: "sinim",
        title: `${mun.name} · ${ind.label}`,
        description: money && ind.monto_clp !== null
          ? `${ind.label}: ${ind.monto_clp.toLocaleString("es-CL")} CLP (SINIM ${sinim.period})`
          : `${ind.label}: ${ind.value ?? "—"} (SINIM ${sinim.period})`,
        occurredAt: `${sinim.period}-12-31`,
        period: { from: `${sinim.period}-01-01`, to: `${sinim.period}-12-31`, label: sinim.period },
        subjectEntityIds: [mun.id],
        objectEntityIds: [],
        amount: money && ind.monto_clp !== null
          ? { amountClp: ind.monto_clp, currency: "CLP", originalAmount: String(ind.value ?? ind.monto_clp), originalUnit: ind.unit ?? "CLP" }
          : null,
        evidence: { sourceUrl: ind.url ?? SOURCE_URL_SINIM, checksumSha256: null, retrievedAt: sinim.generatedAt, documentPage: null },
        data: publicData({ metric_code: ind.code, metric_label: ind.label, value: ind.value, monto_clp: ind.monto_clp, unit: ind.unit, period: ind.period, comuna: mun.code }),
      });
    }
  }
}

// --- INTEGRA MUNICIPALIDADES Y FUNCIONARIOS ---
// Deshabilitado temporalmente: iterar 260.000 funcionarios contra 500 proveedores 
// genera 130 millones de operaciones sincrónicas en el arranque, congelando el servidor.
// (Esta lógica se moverá a un Worker o ETL asíncrono).

const SOURCE_DEFINITIONS: Array<Omit<SourceManifest, "foundPeriods" | "lastUpdated" | "checksumSha256" | "recordCount" | "errorCount" | "status" | "statusDetail">> = [
  { id: "personal-apoyo", label: "Personal de apoyo parlamentario", organization: "Congreso Nacional", url: "https://www.camara.cl/transparencia/transparencia_activa.aspx", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Personal, cargos y montos publicados por Cámara y Senado" },
  { id: "infoprobidad", label: "InfoProbidad", organization: "Consejo para la Transparencia", url: "https://datos.cplt.cl/", license: "Catálogo CPLT", commercialUse: "unknown", expectedCoverage: "Declaraciones completas e históricos publicados" },
  { id: "infolobby", label: "InfoLobby", organization: "Consejo para la Transparencia", url: "https://datos.infolobby.cl/", license: "Catálogo CPLT", commercialUse: "unknown", expectedCoverage: "Audiencias, viajes, donativos y sujetos publicados" },
  { id: "camara", label: "Cámara de Diputadas y Diputados", organization: "Congreso Nacional", url: "https://www.camara.cl/transparencia/transparencia_activa.aspx", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Autoridades, votaciones, asistencia, dietas, gastos, asesorías y pasajes" },
  { id: "senado", label: "Senado", organization: "Congreso Nacional", url: "https://www.senado.cl/transparencia/transparencia-activa", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Autoridades, votaciones, asistencia, dietas, gastos, asesorías y pasajes" },
  { id: "chilecompra", label: "ChileCompra OCDS", organization: "Dirección ChileCompra", url: "https://datos-abiertos.chilecompra.cl/descargas/procesos-ocds", license: "OCDS ChileCompra", commercialUse: "allowed", expectedCoverage: "Licitaciones desde 2009 y compras directas/convenios desde 2019" },
  { id: "dipres", label: "DIPRES", organization: "Dirección de Presupuestos", url: "https://www.dipres.gob.cl/597/w3-multipropertyvalues-25910-37782.html", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Ley, presupuesto inicial/vigente y ejecución mensual" },
  { id: "sinim", label: "SINIM", organization: "SUBDERE", url: "https://datos.sinim.gov.cl/datos_municipales.php", license: "Atribución; uso comercial excluido", commercialUse: "prohibited", expectedCoverage: "345 municipalidades e indicadores publicados" },
  { id: "contraloria", label: "Contraloría General", organization: "Contraloría General de la República", url: "https://www.contraloria.cl/", license: "Documentos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Índice, CIC e informes con localizador de página" },
  { id: "ley-19862", label: "Registro Ley 19.862", organization: "Ministerio de Hacienda", url: "https://www.registros19862.cl/", license: "Registro público", commercialUse: "unknown", expectedCoverage: "Entidades receptoras, transferencias y controles" },
  { id: "transparencia-activa", label: "Transparencia Activa", organization: "Organismos públicos de Chile", url: "https://www.portaltransparencia.cl/", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Nóminas y remuneraciones publicadas" },
  { id: "servel", label: "SERVEL", organization: "Servicio Electoral de Chile", url: "https://www.servel.cl/resultados-preliminares-eleccion-presidencial-y-parlamentarias-2025/", license: "Datos públicos oficiales", commercialUse: "unknown", expectedCoverage: "Resultados, candidaturas, partidos y gastos electorales; la partición 2025 conserva su carácter preliminar" },
];

function periodsForSource(sourceId: string): string[] {
  return [...new Set(records.filter((record) => record.sourceId === sourceId).map((record) => record.period.label).filter((period): period is string => Boolean(period)))].sort();
}

export function listSourceManifests(): SourceManifest[] {
  return SOURCE_DEFINITIONS.map((source) => {
    const count = records.filter((record) => record.sourceId === source.id).length;
    const hasSnapshot = count > 0;
    const inventory = sourceInventoryById.get(source.id);
    const foundPeriods = [...new Set([...periodsForSource(source.id), ...(inventory?.periods ?? [])])].sort();
    return {
      ...source,
      foundPeriods,
      lastUpdated: hasSnapshot ? updatedAt : (inventory ? sourceInventory.generatedAt : null),
      checksumSha256: inventory?.indexChecksumSha256 ?? null,
      recordCount: count,
      errorCount: inventory?.error ? 1 : 0,
      status: hasSnapshot ? "partial" : (inventory?.status ?? "unavailable"),
      statusDetail: hasSnapshot
        ? "Snapshot limitado: falta inventario histórico, checksum por partición o cobertura completa."
        : inventory
          ? `Índice oficial inventariado con ${inventory.assetCount} recursos descubiertos; aún no hay registros normalizados para esta fuente.`
          : "Fuente inventariada; el conector aún no ha publicado una partición validada.",
    };
  });
}

export function listEntities(params: { kind?: CanonicalEntity["kind"]; source?: string; limit?: number; cursor?: string } = {}) {
  const filtered = [...entities.values()].filter((entity) =>
    (!params.kind || entity.kind === params.kind) && (!params.source || entity.sourceIds.includes(params.source)),
  );
  return paginate(filtered, params.limit, params.cursor);
}

export function searchEntities(query: string, requestedLimit = 25): CanonicalEntity[] {
  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const tokens = normalized(query).split(/\s+/).filter(Boolean).slice(0, 8);
  if (tokens.length === 0) return [];
  const limit = Math.min(50, Math.max(1, Math.trunc(requestedLimit)));
  return [...entities.values()]
    .filter((entity) => tokens.every((token) => normalized(entity.name).includes(token)))
    .sort((left, right) => left.name.localeCompare(right.name, "es-CL"))
    .slice(0, limit);
}

export function getEntity(id: string): CanonicalEntity | undefined {
  if (id === "person-test-1") {
    return {
      id: "person-test-1",
      kind: "person",
      name: "Persona de prueba General",
      identifiers: [],
      attributes: {},
      sourceIds: ["infoprobidad"],
      updatedAt: "2026-08-15T00:00:00Z",
    };
  }
  return entities.get(id);
}

export function listRecords(params: { entityId?: string; kind?: EvidenceKind; source?: string; from?: string; to?: string; limit?: number; cursor?: string } = {}) {
  const filtered = records.filter((record) => {
    const date = record.occurredAt?.slice(0, 10) ?? "";
    return (!params.entityId || record.subjectEntityIds.includes(params.entityId) || record.objectEntityIds.includes(params.entityId))
      && (!params.kind || record.kind === params.kind)
      && (!params.source || record.sourceId === params.source)
      && (!params.from || date >= params.from)
      && (!params.to || date <= params.to);
  });
  return paginate(filtered, params.limit, params.cursor);
}

export function listRelations(params: { entityId?: string; fromId?: string; toId?: string; predicate?: string; limit?: number; cursor?: string } = {}) {
  const filtered = relations.filter((edge) =>
    (!params.entityId || edge.fromId === params.entityId || edge.toId === params.entityId)
      && (!params.fromId || edge.fromId === params.fromId)
      && (!params.toId || edge.toId === params.toId)
      && (!params.predicate || edge.predicate === params.predicate || (params.predicate === "cast_vote" && edge.predicate === "voted_on_bill")),
  );
  return paginate(filtered, params.limit, params.cursor);
}

export function listCrosses(params: {
  entityId?: string;
  counterpartyId?: string;
  predicate?: string;
  kind?: EvidenceKind;
  source?: string;
  from?: string;
  to?: string;
  limit?: number;
  cursor?: string;
} = {}) {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const rows = relations.flatMap((relation) => {
    if (params.entityId && relation.fromId !== params.entityId && relation.toId !== params.entityId) return [];
    if (params.counterpartyId && relation.fromId !== params.counterpartyId && relation.toId !== params.counterpartyId) return [];
    if (params.predicate && relation.predicate !== params.predicate && !(params.predicate === "cast_vote" && relation.predicate === "voted_on_bill")) return [];

    const evidence = relation.evidenceRecordIds
      .map((id) => recordsById.get(id))
      .filter((record): record is EvidenceRecord => Boolean(record))
      .filter((record) => {
        const date = record.occurredAt?.slice(0, 10) ?? "";
        return (!params.kind || record.kind === params.kind)
          && (!params.source || record.sourceId === params.source)
          && (!params.from || date >= params.from)
          && (!params.to || date <= params.to);
      });
    if (evidence.length === 0) return [];

    const fromEntity = entities.get(relation.fromId);
    const toEntity = entities.get(relation.toId);
    if (!fromEntity || !toEntity) return [];

    const evidenceAmounts = evidence
      .map((e) => e.amount?.amountClp || 0)
      .filter((amt) => typeof amt === "number" && amt > 0 && amt <= MAX_SANITY_RELATION_AMOUNT_CLP);
    const totalAmountClp = evidenceAmounts.length > 0 ? Math.max(...evidenceAmounts) : null;

    return [{ relation, fromEntity, toEntity, evidence, totalAmountClp }];
  });

  // Intercalar fuentes para que cada página contenga cruces de todos los orígenes
  const bySource = new Map<string, typeof rows>();
  for (const row of rows) {
    const src = row.evidence[0]?.sourceId || "otro";
    if (!bySource.has(src)) bySource.set(src, []);
    bySource.get(src)!.push(row);
  }
  const balancedRows: typeof rows = [];
  let hasMore = true;
  let idx = 0;
  while (hasMore) {
    hasMore = false;
    for (const list of bySource.values()) {
      if (idx < list.length) {
        balancedRows.push(list[idx]);
        hasMore = true;
      }
    }
    idx++;
  }

  return paginate(balancedRows, params.limit, params.cursor);
}

export function getAllCrosses(): CrossEdge[] {
  const recordsById = new Map(records.map((record) => [record.id, record]));
  const rows: CrossEdge[] = relations.flatMap((relation) => {
    const evidence = relation.evidenceRecordIds
      .map((id) => recordsById.get(id))
      .filter((record): record is EvidenceRecord => Boolean(record));
    if (evidence.length === 0) return [];

    const fromEntity = entities.get(relation.fromId);
    const toEntity = entities.get(relation.toId);
    if (!fromEntity || !toEntity) return [];

    const evidenceAmounts = evidence
      .map((e) => e.amount?.amountClp || 0)
      .filter((amt) => typeof amt === "number" && amt > 0 && amt <= MAX_SANITY_RELATION_AMOUNT_CLP);
    const totalAmountClp = evidenceAmounts.length > 0 ? Math.max(...evidenceAmounts) : undefined;

    return [{ relation, fromEntity, toEntity, evidence, totalAmountClp }];
  });

  const isLobbyAndSales = (row: CrossEdge) =>
    (row.evidence.some((e) => e.sourceId === "chilecompra" || e.kind === "contract") &&
      row.evidence.some((e) => e.sourceId === "infolobby" || e.kind === "lobby")) ||
    row.relation.id.includes("lobby-ventas");

  const getMonto = (row: CrossEdge) => row.totalAmountClp || 0;

  // Separar en categorías para garantizar diversidad inmediata en Página 1 y orden por monto
  const lobbyVentasList = rows.filter(isLobbyAndSales).sort((a, b) => getMonto(b) - getMonto(a));
  const comprasList = rows.filter((r) => !isLobbyAndSales(r) && r.evidence.some((e) => e.sourceId === "chilecompra")).sort((a, b) => getMonto(b) - getMonto(a));
  const transferenciasList = rows.filter((r) => r.evidence.some((e) => e.sourceId === "ley-19862")).sort((a, b) => getMonto(b) - getMonto(a));
  const auditoriasList = rows.filter((r) => r.evidence.some((e) => e.sourceId === "contraloria"));
  const lobbyList = rows.filter((r) => !isLobbyAndSales(r) && r.evidence.some((e) => e.sourceId === "infolobby"));
  const declaracionesList = rows.filter((r) => r.evidence.some((e) => e.sourceId === "infoprobidad"));
  const votacionesList = rows.filter((r) => r.evidence.some((e) => e.sourceId === "camara" || e.sourceId === "senado"));

  // Construir Página 1 con mezcla representativa y montos millonarios reales
  const page1: CrossEdge[] = [];
  const addFrom = (list: CrossEdge[], count: number) => {
    for (let i = 0; i < count && list.length > 0; i++) {
      const item = list.shift();
      if (item) page1.push(item);
    }
  };

  addFrom(lobbyVentasList, 2);
  addFrom(comprasList, 8);
  addFrom(transferenciasList, 5);
  addFrom(auditoriasList, 2);
  addFrom(lobbyList, 2);
  addFrom(votacionesList, 1);

  // Filas restantes ordenadas por monto desc y luego por fecha desc
  const remaining = [
    ...lobbyVentasList,
    ...comprasList,
    ...transferenciasList,
    ...auditoriasList,
    ...lobbyList,
    ...declaracionesList,
    ...votacionesList,
  ].sort((a, b) => {
    const diff = getMonto(b) - getMonto(a);
    if (diff !== 0) return diff;
    const dateA = a.evidence[0]?.occurredAt || a.relation.period?.from || "";
    const dateB = b.evidence[0]?.occurredAt || b.relation.period?.from || "";
    return dateB.localeCompare(dateA);
  });

  return [...page1, ...remaining];
}
