import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CanonicalEntity, EvidenceRecord, RelationEdge } from "@/lib/data-contracts";
import PersonEntityProfile from "@/components/PersonEntityProfile";

interface RouteEntry { id: string }
interface EntityPayload { entity: CanonicalEntity; records: EvidenceRecord[]; relations: RelationEdge[] }

function personRoutes(): RouteEntry[] {
  try {
    const routes = JSON.parse(readFileSync(join(process.cwd(), "data", "generated", "entity-routes.json"), "utf8")) as RouteEntry[];
    return routes.filter(({ id }) => {
      try {
        const payload = JSON.parse(readFileSync(join(process.cwd(), "data", "generated", "entities", `${id}.json`), "utf8")) as EntityPayload;
        return payload.entity?.kind === "person";
      } catch { return false; }
    });
  } catch { return []; }
}

export function generateStaticParams() {
  return personRoutes();
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  try {
    const payload = JSON.parse(readFileSync(join(process.cwd(), "data", "generated", "entities", `${id}.json`), "utf8")) as EntityPayload;
    return { title: `${payload.entity.name} — Ficha pública`, alternates: { canonical: `/personas/${id}` } };
  } catch { return { title: "Ficha pública de persona" }; }
}

/** Reuse the canonical evidence profile at the requested person-oriented URL. */
export default async function PersonProfileRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let payload: EntityPayload;
  try {
    payload = JSON.parse(readFileSync(join(process.cwd(), "data", "generated", "entities", `${id}.json`), "utf8")) as EntityPayload;
    if (payload.entity?.kind !== "person") notFound();
  } catch { notFound(); }
  const counterpartIds = [...new Set(payload.relations.map((relation) => relation.fromId === id ? relation.toId : relation.fromId))];
  const counterpartNames = Object.fromEntries(counterpartIds.map((counterpartId) => {
    try {
      const related = JSON.parse(readFileSync(join(process.cwd(), "data", "generated", "entities", `${counterpartId}.json`), "utf8")) as EntityPayload;
      return [counterpartId, related.entity?.name ?? counterpartId];
    } catch { return [counterpartId, counterpartId]; }
  }));
  return <PersonEntityProfile entity={payload.entity} records={payload.records} relations={payload.relations} counterpartNames={counterpartNames} />;
}
