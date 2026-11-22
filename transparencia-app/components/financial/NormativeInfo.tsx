"use client";
import { useEffect, useId, useRef, useState } from "react";
import { normativeConceptIds, normativeReference, type NormativeQuery, } from "@/lib/parliamentary-normative";
import { normativePanelPresentation } from "@/lib/parliamentary-normative-presentation";
import styles from "./NormativeInfo.module.css";
export default function NormativeInfo(props: NormativeQuery & {
    label?: string;
}) {
    const [open, setOpen] = useState(false), [tab, setTab] = useState("included"), [concept, setConcept] = useState("");
    const ref = useRef<HTMLDialogElement>(null), id = useId();
    const ids = normativeConceptIds(props);
    const presentation = normativePanelPresentation(props);
    const definition = presentation.definitions.find(d => d.id === concept) ?? presentation.definitions[0];
    const tabs = definition ? [
        { key: "included" as const, label: "Qué contempla", values: definition.included },
        { key: "excluded" as const, label: "Qué no permite", values: definition.excluded },
        { key: "restrictions" as const, label: "Condiciones", values: definition.restrictions },
    ].filter(t => t.values.length) : [];
    const activeTab = tabs.find(t => t.key === tab) ?? tabs[0];
    useEffect(() => {
        const dialog = ref.current;
        if (!dialog)
            return;
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
    if (!ids.length)
        return null;
    return (<>
      <button type="button" className={styles.trigger} aria-label={`Información normativa${props.label ? ": " + props.label : ""}`} aria-haspopup="dialog" onClick={() => setOpen(true)}>
        ⓘ
      </button>
      <dialog ref={ref} className={styles.panel} aria-labelledby={id} onCancel={(e) => {
            e.preventDefault();
            setOpen(false);
        }} onClick={(e) => {
            if (e.target === e.currentTarget)
                setOpen(false);
        }}>
        {open && (<div className={styles.content}>
            <header>
              <h2 id={id}>Alcance normativo</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar normativa">
                Cerrar ×
              </button>
            </header>
            {props.from && <p className={styles.period}>{props.from}{props.to && props.to !== props.from ? ` — ${props.to}` : ""}</p>}
            {presentation.transition && <p className={styles.transition}>
              El período cruza un cambio normativo. Se muestra el tramo desde {presentation.displayedVersion?.validFrom.split("-").reverse().join("/")}.
              {" "}<a href={`/como-funciona/?norma=${presentation.displayedVersion?.id ?? ""}#normativa-y-fuentes`}>Revisar otras vigencias</a>
            </p>}
            {presentation.definitions.length > 1 && <label className={styles.conceptPicker}>
              Concepto
              <select aria-label="Concepto normativo" value={definition?.id ?? ""} onChange={e => { setConcept(e.target.value); setTab("included"); }}>
                {presentation.definitions.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </label>}
            {definition ? <section>
              <h3>{definition.label}</h3>
              <p>{definition.description}</p>
              <div className={styles.tabs} role="group" aria-label="Contenido normativo">
                {tabs.map(t => <button key={t.key} type="button" aria-pressed={activeTab?.key === t.key} onClick={() => setTab(t.key)}>{t.label}</button>)}
              </div>
              {activeTab?.key === "restrictions" ? <div key={definition.id + definition.versionId} className={styles.conditions}>
                {definition.conditions.map((condition,index)=><details key={condition.id} open={index===0}>
                  <summary>{condition.title}</summary><p>{condition.text}</p>
                </details>)}
              </div> : <ul>{activeTab?.values.map(value => <li key={value}>{value}</li>)}</ul>}
              <footer className={styles.links}>
                <a href={normativeReference(definition).url} target="_blank" rel="noopener noreferrer">Ver normativa oficial ↗</a>
                {definition.generalRules.length > 0 && <a href={`/como-funciona/?norma=${definition.versionId}#reglas-generales`}>Consultar reglas generales</a>}
              </footer>
            </section> : <section>
              <h3>Asignaciones parlamentarias</h3>
              <p>{!presentation.displayedVersion ? "No hay una norma identificada para este período. Consulta las versiones históricas." : presentation.general?.description ?? "Consulta las reglas generales de las asignaciones parlamentarias."}</p>
              <a href="/como-funciona/#normativa-y-fuentes">Ver normativa oficial</a>
            </section>}

          </div>)}
      </dialog>
    </>);
}
