"use client";
import { useSearchParams } from "next/navigation";
import { officialReference } from "@/lib/source-access";
export default function OfficialReference() { const url = officialReference(useSearchParams().get("referencia")); if (!url)
    return null; return <section className="card" id="referencia-oficial" aria-label="Referencia oficial seleccionada" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}><h2>Fuente y alcance del registro consultado</h2><p>Esta es la referencia que acompaña al dato. Su período y cobertura corresponden al registro consultado; abrir el portal no acredita que el organismo haya publicado un mes más reciente.</p><a href={url} target="_blank" rel="noopener noreferrer" style={{ overflowWrap: "anywhere" }}>Abrir documento o portal oficial ↗</a><p style={{ fontSize: ".75rem", overflowWrap: "anywhere" }}>{url}</p></section>; }
