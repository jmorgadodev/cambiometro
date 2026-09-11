"use client";

import { useEffect, useState, type ReactNode } from "react";

export default function CrucesTabs({ relations, records }: { relations: ReactNode; records: ReactNode }) {
  const [active, setActive] = useState<"relations" | "records">("relations");
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("vista") === "registros") setActive("records");
  }, []);
  return (
    <section aria-label="Exploradores de cruces y registros">
      <div role="tablist" aria-label="Vista de cruces" style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
        <button type="button" role="tab" aria-selected={active === "relations"} className={active === "relations" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActive("relations")}>
          Relaciones cruzadas
        </button>
        <button type="button" role="tab" aria-selected={active === "records"} className={active === "records" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActive("records")}>
          Registros por fuente
        </button>
      </div>
      <div role="tabpanel" hidden={active !== "relations"} aria-label="Relaciones documentales">
        {active === "relations" ? relations : null}
      </div>
      <div role="tabpanel" hidden={active !== "records"} aria-label="Registros originales por fuente">
        {active === "records" ? records : null}
      </div>
    </section>
  );
}
