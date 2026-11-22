"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  NORMATIVE_CATALOG,
  normativeConceptIds,
  normativeDefinitions,
  normativeReference,
  normativeVersions,
  type NormativeQuery,
} from "@/lib/parliamentary-normative";
import styles from "./NormativeInfo.module.css";
export default function NormativeInfo(
  props: NormativeQuery & { label?: string },
) {
  const [open, setOpen] = useState(false),
    [tab, setTab] = useState("included");
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  const ids = normativeConceptIds(props),
    definitions = normativeDefinitions(props),
    versions = normativeVersions(props.from, props.to ?? props.from);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (!open) {
      dialog.close();
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
      active?.focus({ preventScroll: true });
    };
  }, [open]);
  if (!ids.length) return null;
  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        aria-label={`Información normativa${props.label ? ": " + props.label : ""}`}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        ⓘ
      </button>
      <dialog
        ref={ref}
        className={styles.panel}
        aria-labelledby={id}
        onCancel={(e) => {
          e.preventDefault();
          setOpen(false);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setOpen(false);
        }}
      >
        {open && (
          <div className={styles.content}>
            <header>
              <h2 id={id}>Alcance normativo</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar normativa"
              >
                Cerrar ×
              </button>
            </header>
            <p>
              {props.from
                ? `${props.from}${props.to && props.to !== props.from ? " — " + props.to : ""}`
                : "Versiones verificadas"}{" "}
              · Cámara y Senado
            </p>
            {versions.length > 1 && (
              <p>
                El período puede abarcar más de una vigencia. Sin fecha
                individual no se atribuye todo el mes a una sola resolución.
              </p>
            )}
            {!definitions.length && (
              <p>
                No hay una definición aprobada para esta fecha. Consulta el
                documento histórico; no se aplica una norma posterior.
              </p>
            )}
            <div
              className={styles.tabs}
              role="group"
              aria-label="Contenido normativo"
            >
              {[
                ["included", "Qué contempla"],
                ["excluded", "Qué no permite"],
                ["restrictions", "Restricciones"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={tab === key}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            {definitions.map((d) => {
              const source = normativeReference(d);
              const values = d[tab as "included" | "excluded" | "restrictions"];
              return (
                <section key={d.id + d.versionId}>
                  <h3>{d.label}</h3>
                  <small>
                    {source.label} · desde {d.validFrom}
                    {d.validTo ? ` hasta ${d.validTo}` : ""}
                  </small>
                  <p>{d.description}</p>
                  {values.length ? (
                    <ul>
                      {values.map((v) => (
                        <li key={v}>{v}</li>
                      ))}
                    </ul>
                  ) : (
                    <p>
                      No se enumeran exclusiones específicas en esta síntesis.
                      Esto no equivale a autorización de cualquier gasto.
                    </p>
                  )}
                  {props.items && props.items.length > 0 && (
                    <details>
                      <summary>Ítems originales relacionados</summary>
                      <ul>
                        {[...new Set(props.items)]
                          .filter((item) =>
                            normativeConceptIds({ items: [item] }).includes(
                              d.id,
                            ),
                          )
                          .map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                      </ul>
                    </details>
                  )}
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Fuente oficial · {source.section} · página PDF {source.page}{" "}
                    ↗
                  </a>
                  {d.generalRules.length > 0 && (
                    <details>
                      <summary>Reglas generales de las asignaciones</summary>
                      {NORMATIVE_CATALOG.definitions
                        .filter(
                          (g) =>
                            g.id === "general" && g.versionId === d.versionId,
                        )
                        .map((g) => (
                          <div key={g.versionId}>
                            <p>{g.description}</p>
                            <ul>
                              {[...g.excluded, ...g.restrictions].map((v) => (
                                <li key={v}>{v}</li>
                              ))}
                            </ul>
                            <a
                              href={normativeReference(g).url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Disposiciones generales ↗
                            </a>
                          </div>
                        ))}
                    </details>
                  )}
                </section>
              );
            })}
            <details>
              <summary>Versión y alcance de la síntesis</summary>
              <p>
                Catálogo {NORMATIVE_CATALOG.catalogVersion}. Verificado el{" "}
                {NORMATIVE_CATALOG.verifiedAt}. Síntesis de disposiciones
                seleccionadas; consultar también las instrucciones y acuerdos
                complementarios. La definición explica el concepto: no acredita
                una compra concreta ni determina irregularidades.
              </p>
              <p>
                El texto histórico conserva su propia vigencia. Las categorías
                visuales no cambian el ítem original de cada registro.
              </p>
            </details>
          </div>
        )}
      </dialog>
    </>
  );
}
export function NormativeCatalogue() {
  return (
    <section
      className="card"
      style={{ padding: "1.5rem" }}
      id="catalogo-normativo"
    >
      <h2>Catálogo normativo de asignaciones parlamentarias</h2>
      <p>
        Definiciones y documentos del Consejo Resolutivo, con sus versiones y
        vigencias.
      </p>
      <ul>
        {NORMATIVE_CATALOG.versions.map((v) => (
          <li key={v.id}>
            <a href={v.url} target="_blank" rel="noopener noreferrer">
              {v.label}
            </a>{" "}
            · {v.validFrom}
            {v.validTo ? ` — ${v.validTo}` : " en adelante"}
          </li>
        ))}
      </ul>
      <ul>
        {NORMATIVE_CATALOG.definitions
          .filter((d) => d.versionId === "crap-res-12")
          .map((d) => (
            <li key={d.id}>
              {d.label} <NormativeInfo conceptIds={[d.id]} label={d.label} />
            </li>
          ))}
      </ul>
    </section>
  );
}
