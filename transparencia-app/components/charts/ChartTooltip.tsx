"use client";
import { useId, useState, useEffect, type MouseEvent, type FocusEvent, type PointerEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { formatCLP } from "@/lib/format";
import styles from "./ChartTooltip.module.css";
export interface ChartDetail { title: string; rows: { label: string; amount: number | null; detail?: string }[] }
export function useChartTooltip(zeroForMissing = false, version = "") {
  const id = useId();
  const [active, setActive] = useState<{ key: string; version: string; detail: ChartDetail; x: number; y: number } | null>(null);
  const clear = () => setActive(null);
  const activeKey = active?.key;
  useEffect(() => {
    if (!activeKey) return;
    const hide = () => setActive(null);
    const outside = (event: globalThis.PointerEvent) => { if (!(event.target instanceof Element) || event.target.closest("[data-chart-tooltip-owner]")?.getAttribute("data-chart-tooltip-owner") !== id) hide(); };
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === "Escape") hide(); };
    window.addEventListener("scroll", hide, true); window.addEventListener("resize", hide);
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { window.removeEventListener("scroll", hide, true); window.removeEventListener("resize", hide); document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [activeKey, id]);
  function bind(key: string, detail: ChartDetail) {
    const describe = (amount: number | null) => amount === null ? zeroForMissing ? "$0 · Aún no disponible" : "Aún no disponible" : formatCLP(amount);
    const label = `${detail.title}. ${detail.rows.map(row => `${row.label}: ${describe(row.amount)}`).join(". ")}`;
    const locate = (target: SVGElement) => { const rect = target.getBoundingClientRect(); return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }; };
    const open = (target: SVGElement) => setActive({ key, version, detail, ...locate(target) });
    return {
      role: "button" as const, tabIndex: 0, "aria-label": label, "aria-describedby": active?.version === version && active.key === key ? id : undefined,
      "data-chart-point": key, "data-chart-tooltip-owner": id,
      onPointerEnter: (event: PointerEvent<SVGElement>) => { if (event.pointerType !== "touch") setActive({ key, version, detail, x: event.clientX, y: event.clientY }); },
      onPointerMove: (event: PointerEvent<SVGElement>) => { if (event.pointerType !== "touch") setActive({ key, version, detail, x: event.clientX, y: event.clientY }); },
      onPointerLeave: (event: PointerEvent<SVGElement>) => { if (event.pointerType !== "touch") clear(); },
      onPointerUp: (event: PointerEvent<SVGElement>) => { if (event.pointerType === "touch") open(event.currentTarget); },
      onClick: (event: MouseEvent<SVGElement>) => open(event.currentTarget),
      onFocus: (event: FocusEvent<SVGElement>) => open(event.currentTarget), onBlur: clear,
      onKeyDown: (event: KeyboardEvent<SVGElement>) => { if (event.key === "Escape") clear(); if (["Enter", " "].includes(event.key)) { event.preventDefault(); open(event.currentTarget); } },
    };
  }
  const height = active && typeof window !== "undefined" ? Math.min(96 + active.detail.rows.length * 64, window.innerHeight * .7) : 0;
  const overlay = active && active.version === version && typeof document !== "undefined" ? createPortal(<div id={id} role="tooltip" className={styles.tooltip} style={{ left: Math.max(12, Math.min(active.x + 14, window.innerWidth - 300)), top: Math.max(12, Math.min(active.y + 16 + height <= window.innerHeight - 12 ? active.y + 16 : active.y - height - 16, window.innerHeight - height - 12)) }}>
    <strong>{active.detail.title}</strong><dl>{active.detail.rows.map((row, i) => <div key={i}><dt>{row.label}</dt><dd>{row.amount === null ? zeroForMissing ? "$0 · Aún no disponible" : "Aún no disponible" : formatCLP(row.amount)}{row.detail && <small>{row.detail}</small>}</dd></div>)}</dl><span className={styles.help}>Esc o toca fuera para cerrar</span>
  </div>, document.body) : null;
  return { bind, overlay, clear };
}
