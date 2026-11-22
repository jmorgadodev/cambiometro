"use client";
import { useSyncExternalStore, useState } from "react";
import { NORMATIVE_CATALOG, normativeReference } from "@/lib/parliamentary-normative";
import styles from "./NormativeInfo.module.css";
const readRequestedVersion = () => new URLSearchParams(window.location.search).get("norma") ?? "";
const subscribeToLocation = (notify: () => void) => { window.addEventListener("popstate", notify); return () => window.removeEventListener("popstate", notify); };
export default function NormativeCatalogue() {
    const versions = [...NORMATIVE_CATALOG.versions].sort((a, b) => b.validFrom.localeCompare(a.validFrom));
    const [selection, setSelection] = useState<string | null>(null);
    const requested = useSyncExternalStore(subscribeToLocation, readRequestedVersion, () => "");
    const version = versions.find(v => v.id === (selection ?? requested)) ?? versions[0];
    const versionId = version.id;
    const chooseVersion = (id: string) => {
        setSelection(id);
        const url = new URL(window.location.href);
        url.searchParams.set("norma", id);
        window.history.replaceState(window.history.state, "", url);
    };
    const definitions = NORMATIVE_CATALOG.definitions.filter(d => d.versionId === version.id);
    const general = definitions.find(d => d.id === "general")!;
    const reference = (d: typeof general) => { const source = normativeReference(d); return <p className={styles.documentReference}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.label} · {source.section} · página PDF {source.page} ↗</a></p>; };
    const sections = (d: typeof general) => <>{d.included.length > 0 && <><h4>Qué contempla</h4><ul>{d.included.map(t => <li key={t}>{t}</li>)}</ul></>}{d.excluded.length > 0 && <><h4>Qué no permite</h4><ul>{d.excluded.map(t => <li key={t}>{t}</li>)}</ul></>}{d.restrictions.length > 0 && <><h4>Condiciones y excepciones</h4><ul>{d.restrictions.map(t => <li key={t}>{t}</li>)}</ul></>}{reference(d)}</>;
    return <section className={`card ${styles.documentary}`} id="catalogo-normativo">
  <h2 id="normativa-y-fuentes">Normativa y fuentes</h2>
  <p>Reglas comunes, disposiciones por concepto y documentos del Consejo Resolutivo de Asignaciones Parlamentarias.</p>
  <label className={styles.conceptPicker}>Versión normativa
   <select aria-label="Versión normativa" value={versionId} onChange={e => chooseVersion(e.target.value)}>
    {versions.map(v => <option key={v.id} value={v.id}>{v.label} · desde {v.validFrom}{v.validTo ? ` hasta ${v.validTo}` : ""}</option>)}
   </select>
  </label>
  <p>Vigencia: {version.validFrom}{version.validTo ? ` — ${version.validTo}` : " en adelante"}. Si el período consultado cruza un cambio, revisa la norma aplicable al día del gasto.</p>
  <section id="reglas-generales">
   <h3>Reglas generales y prohibiciones transversales</h3>
   <p>{general.description}</p>{sections(general)}
  </section>
  <h3>Disposiciones por concepto</h3>
  <div key={versionId} className={styles.documentDefinitions}>
   {definitions.filter(d => d.id !== "general").map(d => <details key={d.id} id={`norma-${d.id}`}><summary>{d.label}</summary><p>{d.description}</p>{sections(d)}<a href="#reglas-generales">Consultar reglas generales</a></details>)}
  </div>
  <details><summary>Documentos y versiones históricas</summary>
   <ul>{versions.map(v => <li key={v.id}><a href={v.url} target="_blank" rel="noopener noreferrer">{v.label} · {v.publishedAt} ↗</a><span> · Vigencia desde {v.validFrom}{v.validTo ? ` hasta ${v.validTo}` : " en adelante"}</span></li>)}</ul>
  </details>
  <details><summary>Verificación, alcance y actualización</summary>
   <p>Catálogo {NORMATIVE_CATALOG.catalogVersion}. Última verificación: {NORMATIVE_CATALOG.verifiedAt}. Síntesis de disposiciones seleccionadas; consultar también instrucciones y acuerdos complementarios. Las definiciones explican el alcance de los conceptos, no acreditan compras concretas ni determinan irregularidades.</p>
   <p>Las versiones anteriores conservan su vigencia. La detección periódica de documentos no modifica automáticamente las definiciones: las actualizaciones sustantivas requieren validación antes de publicarse.</p>
   <ul>{versions.map(v => <li key={v.id}>{v.label} · documento original SHA-256: <code>{v.sha256}</code></li>)}</ul>
  </details>
 </section>;
}
