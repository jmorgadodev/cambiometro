import Image from "next/image";
import Link from "@/components/SiteLink";
import Breadcrumbs from "@/components/Breadcrumbs";
import type { CanonicalEntity, EvidenceRecord, RelationEdge } from "@/lib/data-contracts";
import {
  allPersonEvidenceSections,
  personEntityPresentation,
  summarizePersonRelations,
} from "@/lib/person-entity";
import { politicoIdFromEntityId } from "@/lib/politico-canonical";
import { getPoliticoSlug } from "@/lib/politico-slugs";
import EntityEvidenceAccordionExplorer from "@/components/records/EntityEvidenceAccordionExplorer";

interface Props {
  entity: CanonicalEntity;
  records: EvidenceRecord[];
  relations: RelationEdge[];
  counterpartNames: Record<string, string>;
}

export default function PersonEntityProfile({
  entity,
  records,
  relations,
  counterpartNames,
}: Props) {
  const presentation = personEntityPresentation(entity);
  const sections = allPersonEvidenceSections(records);
  const relationSummaries = summarizePersonRelations(relations, entity.id);

  const politicoId = politicoIdFromEntityId(entity.id, entity.name);
  const politicoPath = politicoId ? `/politico/${getPoliticoSlug(politicoId)}` : presentation.politicianPath;

  return (
    <main className="person-entity" style={{ paddingBottom: "4rem" }}>
      {politicoPath && (
        <div className="container-main" style={{ paddingTop: "1.5rem" }}>
          <div
            style={{
              background: "var(--info-bg)",
              border: "1.5px solid var(--accent)",
              borderRadius: 12,
              padding: "1rem 1.25rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <strong style={{ color: "var(--text-primary)", display: "block", fontSize: "0.95rem" }}>
                🏛️ Esta autoridad cuenta con Ficha Oficial de Transparencia
              </strong>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Esta es una ficha técnica de evidencia cruda. Para ver la información consolidada de votaciones, asistencia, gastos operacionales y personal de apoyo, accede a su ficha principal.
              </span>
            </div>
            <Link href={politicoPath} className="btn btn-primary" style={{ fontSize: "0.82rem", padding: "0.55rem 1rem", textDecoration: "none", whiteSpace: "nowrap" }}>
              Ver Ficha de Transparencia →
            </Link>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="person-entity__hero" id="resumen">
        <div className="container-main person-entity__hero-grid">
          <div style={{ gridColumn: "1 / -1", marginBottom: "-0.5rem" }}>
            <Breadcrumbs
              items={[
                { label: "Entidades", href: "/cruces" },
                { label: entity.name },
              ]}
            />
          </div>
          <div className="person-entity__identity">
            <div className="person-entity__photo">
              {presentation.photoUrl ? (
                <Image
                  src={presentation.photoUrl}
                  alt={entity.name}
                  width={128}
                  height={128}
                  priority
                />
              ) : (
                <span aria-label={`Fotografía no publicada para ${entity.name}`}>
                  {presentation.initials}
                </span>
              )}
            </div>
            <div>
              <p className="eyebrow">Persona · evidencia oficial</p>
              <h1>{entity.name}</h1>
              <p className="person-entity__role">{presentation.role ?? "Cargo no informado por la fuente"}</p>
              <p className="person-entity__photo-note">
                {presentation.photoUrl
                  ? "Fotografía verificada en una fuente pública."
                  : "La fuente consultada no publicó una fotografía; se muestran iniciales."}
                {presentation.photoSourceUrl ? (
                  <> <a href={presentation.photoSourceUrl} target="_blank" rel="noreferrer">Ver procedencia ↗</a></>
                ) : null}
              </p>
              {politicoPath ? (
                <Link className="btn btn-primary" href={politicoPath}>
                  Abrir Ficha de Transparencia Completa
                </Link>
              ) : null}
            </div>
          </div>
          <dl className="person-entity__stats">
            <div><dt>Registros</dt><dd>{records.length}</dd></div>
            <div><dt>Vínculos resumidos</dt><dd>{relationSummaries.length}</dd></div>
            <div><dt>Fuentes</dt><dd>{(entity.sourceIds ?? []).length}</dd></div>
          </dl>
        </div>
      </section>

      <div className="container-main" style={{ marginTop: "2rem", display: "flex", flexDirection: "column", gap: "2rem" }}>
        
        {/* Navegación rápida por secciones */}
        <nav className="person-entity__nav" aria-label="Contenido de la ficha">
          {sections.map((section) => (
            <a key={section.id} href={`#${section.id}`}>
              <span>{section.label}</span>
              <b>{section.records.length}</b>
            </a>
          ))}
          <a href="#relaciones"><span>Relaciones</span><b>{relationSummaries.length}</b></a>
          <a href="#fuentes"><span>Fuentes</span><b>{(entity.sourceIds ?? []).length}</b></a>
        </nav>

        {/* Explorador de Evidencias en Acordeones Paginados (Máx 15 filas) */}
        <div>
          <div style={{ marginBottom: "1rem" }}>
            <span className="eyebrow">Reporte Consolidado</span>
            <h2 style={{ fontSize: "1.35rem", fontWeight: 800, margin: "0.2rem 0 0.3rem", color: "var(--text-primary)" }}>
              Evidencia Documental y Actos Administrativos
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Registros oficiales agrupados por origen temático con filtros en tiempo real y paginación compacta.
            </p>
          </div>

          <EntityEvidenceAccordionExplorer records={records} entityName={entity.name} />
        </div>

        {/* Relaciones Documentales */}
        {relationSummaries.length > 0 && (
          <section className="card" style={{ padding: "1.75rem" }} id="relaciones">
            <div style={{ marginBottom: "1rem" }}>
              <span className="eyebrow">{relationSummaries.length} vínculos resumidos</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0.2rem 0 0.3rem", color: "var(--text-primary)" }}>
                Relaciones Documentales
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Entidades públicas y organizaciones con las que registra vínculos administrativos o contractuales.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.75rem" }}>
              {relationSummaries.map((relation) => (
                <div
                  key={`${relation.counterpartId}-${relation.predicate}`}
                  style={{
                    padding: "1rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 8,
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.3rem" }}>
                    <span className="badge badge-info" style={{ fontSize: "0.68rem" }}>
                      {relation.predicate.replaceAll("_", " ")}
                    </span>
                    <strong style={{ fontSize: "0.75rem", color: "var(--text-subtle)", fontFamily: "monospace" }}>
                      {relation.evidenceCount} evidencias
                    </strong>
                  </div>
                  <h3 style={{ fontSize: "0.95rem", margin: "0.3rem 0 0.2rem", fontWeight: 700 }}>
                    <Link href={`/entidades/${relation.counterpartId}`} style={{ color: "var(--accent)", textDecoration: "none" }}>
                      {counterpartNames[relation.counterpartId] ?? relation.counterpartId}
                    </Link>
                  </h3>
                  <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                    {relation.disclaimer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Trazabilidad y Fuentes */}
        {entity.identifiers && entity.identifiers.length > 0 && (
          <section className="card" style={{ padding: "1.75rem" }} id="fuentes">
            <div style={{ marginBottom: "1rem" }}>
              <span className="eyebrow">Trazabilidad</span>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 800, margin: "0.2rem 0 0.3rem", color: "var(--text-primary)" }}>
                Fuentes e Identificadores Oficiales
              </h2>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                Claves oficiales utilizadas para la conciliación determinista de identidad sin inferencias algorítmicas.
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {entity.identifiers.map((identifier) => (
                <div
                  key={`${identifier.scheme}-${identifier.value}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.65rem 0.85rem",
                    background: "var(--bg-surface-2)",
                    borderRadius: 6,
                    border: "1px solid var(--border-subtle)",
                    fontSize: "0.82rem",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}
                >
                  <div>
                    <strong style={{ color: "var(--text-primary)" }}>{identifier.scheme}: </strong>
                    <code style={{ color: "var(--accent)" }}>{identifier.value}</code>
                  </div>
                  {identifier.sourceUrl && (
                    <a href={identifier.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem" }}>
                      Abrir Origen Oficial ↗
                    </a>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
