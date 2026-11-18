"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import PoliticosListClient, { type PoliticoCardData } from "@/components/PoliticosListClient";
import { filterCongressEntries, readCongressFilters, type CongressChamber } from "@/lib/congress-filters";

function filterHref(cargo: CongressChamber | null, query: string): string {
  const params = new URLSearchParams();
  if (cargo) params.set("cargo", cargo);
  if (query) params.set("q", query);
  const suffix = params.toString();
  return suffix ? `/politico?${suffix}` : "/politico";
}

export function CongressSearchForm() {
  const searchParams = useSearchParams();
  const filters = readCongressFilters(searchParams);

  return (
    <form className="cross-search" role="search" action="/politico" key={`${filters.cargo ?? "all"}-${filters.query}`}>
      <label htmlFor="politico-query">Nombre, partido, distrito o región</label>
      <div>
        <input id="politico-query" name="q" type="search" defaultValue={filters.query} placeholder="Ej.: Kaiser, Araucanía o RN" />
        {filters.cargo && <input type="hidden" name="cargo" value={filters.cargo} />}
        <button className="btn btn-primary">Buscar</button>
      </div>
    </form>
  );
}

export default function CongressDirectoryClient({
  items,
  children,
}: {
  items: PoliticoCardData[];
  children?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const filters = readCongressFilters(searchParams);
  const filtered = filterCongressEntries(items, filters);
  const deputies = filtered.filter(({ politico }) => politico.cargo === "Diputado");
  const senators = filtered.filter(({ politico }) => politico.cargo === "Senador");
  const deputyCount = items.filter(({ politico }) => politico.cargo === "Diputado").length;
  const senateCount = items.filter(({ politico }) => politico.cargo === "Senador").length;

  return (
    <>
      <div className="politico-filters" role="group" aria-label="Filtrar por cámara">
        <Link prefetch={false} className="btn btn-ghost" href={filterHref(null, filters.query)} aria-current={!filters.cargo ? "page" : undefined}>
          Todas ({items.length})
        </Link>
        <Link prefetch={false} className="btn btn-ghost" href={filterHref("Diputado", filters.query)} aria-current={filters.cargo === "Diputado" ? "page" : undefined}>
          Diputados ({deputyCount})
        </Link>
        <Link prefetch={false} className="btn btn-ghost" href={filterHref("Senador", filters.query)} aria-current={filters.cargo === "Senador" ? "page" : undefined}>
          Senado ({senateCount})
        </Link>
      </div>

      {(filters.query || filters.cargo) && (
        <p className="relation-disclaimer" role="status">
          <strong>{filtered.length} coincidencia{filtered.length === 1 ? "" : "s"}</strong>
          {filters.query ? <> para “{filters.query}”</> : null}
          {filters.cargo ? <> · {filters.cargo === "Diputado" ? "Cámara de Diputadas y Diputados" : "Senado"}</> : null}
        </p>
      )}

      {senators.length > 0 && (
        <PoliticosListClient items={senators} key={`senadores-${filters.query}`} title="Senadores" eyebrow="Cámara Alta" pageSize={20} />
      )}
      {deputies.length > 0 && (
        <PoliticosListClient items={deputies} key={`diputados-${filters.query}`} title="Diputados" eyebrow="Cámara Baja" pageSize={20} />
      )}

      {filtered.length === 0 && (
        <div className="empty-state" role="status">
          <strong>Sin coincidencias</strong>
          <p>Prueba con un apellido, partido, distrito o región diferente.</p>
          <Link prefetch={false} className="btn btn-primary" href="/politico">Ver Congreso completo</Link>
        </div>
      )}

      {!filters.query && !filters.cargo ? children : null}
    </>
  );
}
