"use client";
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { memberLabel, type ExplorerMember } from "@/lib/parliamentary-explorer";
import styles from "./Explorer.module.css";
export function ExplorerDrawer({
  open,
  title,
  side = "right",
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  side?: "left" | "right";
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const node = dialog.current;
    if (!open || !node) return;
    const previous = document.activeElement as HTMLElement | null;
    const x = scrollX,
      y = scrollY;
    node.showModal();
    heading.current?.focus({ preventScroll: true });
    return () => {
      node.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
      window.scrollTo(x, y);
    };
  }, [open]);
  return (
    <dialog
      ref={dialog}
      className={styles.drawer}
      data-side={side}
      aria-labelledby={`explorer-${side}-title`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className={styles.drawerHead}>
        <h2 id={`explorer-${side}-title`} ref={heading} tabIndex={-1}>
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Cerrar ${side === "left" ? "filtros" : "detalle"}`}
        >
          Cerrar ×
        </button>
      </div>
      <div className={styles.drawerBody}>{open ? children : null}</div>
    </dialog>
  );
}
export function MemberAvatar({
  member,
  size = 36,
}: {
  member: ExplorerMember;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  return member.photo && !failed ? (
    <img
      src={member.photo}
      alt={`Retrato de ${member.name}`}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      className={styles.avatar}
      onError={() => setFailed(true)}
    />
  ) : (
    <span
      role="img"
      className={styles.avatar}
      style={{ width: size, height: size }}
      aria-label={`Sin fotografía verificada de ${member.name}`}
    >
      {member.name
        .split(" ")
        .slice(0, 2)
        .map((w) => w[0])
        .join("")}
    </span>
  );
}
export function MemberName({
  member,
  onClick,
  detail = true,
}: {
  member: ExplorerMember;
  onClick?: () => void;
  detail?: boolean;
}) {
  return (
    <button type="button" className={styles.memberButton} onClick={onClick}>
      <MemberAvatar member={member} />
      <span>
        <strong>{memberLabel(member)}</strong>
        {detail && (
          <small>
            {member.partyLabel} · {member.regionLabel}
          </small>
        )}
      </span>
    </button>
  );
}
export function downloadExplorerBlob(body: Blob, name: string) {
  const url = URL.createObjectURL(body),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportExplorerSvg(
  svg: SVGSVGElement,
  title: string,
  context: string,
) {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const style = getComputedStyle(svg);
  for (const element of [clone, ...Array.from(clone.querySelectorAll("*"))])
    for (const attr of ["fill", "stroke", "color", "style"]) {
      const value = element.getAttribute(attr);
      if (value?.includes("var("))
        element.setAttribute(
          attr,
          value.replace(
            /var\((--[\w-]+)\)/g,
            (_, key) => style.getPropertyValue(key).trim() || "currentColor",
          ),
        );
    }
  const ns = "http://www.w3.org/2000/svg",
    box = svg.viewBox.baseVal;
  clone.setAttribute("xmlns", ns);
  clone.setAttribute("viewBox", `0 0 ${box.width} ${box.height + 72}`);
  clone.setAttribute("width", String(box.width));
  clone.setAttribute("height", String(box.height + 72));
  const group = document.createElementNS(ns, "g");
  while (clone.firstChild) group.appendChild(clone.firstChild);
  group.setAttribute("transform", "translate(0 64)");
  clone.appendChild(group);
  const bg = document.createElementNS(ns, "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute(
    "fill",
    style.getPropertyValue("--surface").trim() || "white",
  );
  clone.insertBefore(bg, clone.firstChild);
  for (const [index, text] of [
    title,
    context + " · El Cambiómetro · Fuentes: Cámara, Senado y registro 38 bis",
  ].entries()) {
    const label = document.createElementNS(ns, "text");
    label.textContent = text;
    label.setAttribute("x", "16");
    label.setAttribute("y", String(24 + index * 23));
    label.setAttribute(
      "fill",
      style.getPropertyValue("--text-1").trim() || "black",
    );
    label.setAttribute("font-size", index ? "12" : "18");
    clone.appendChild(label);
  }
  downloadExplorerBlob(
    new Blob([new XMLSerializer().serializeToString(clone)], {
      type: "image/svg+xml;charset=utf-8",
    }),
    "cambiometro-grafico.svg",
  );
}
export function DataState({
  loading,
  error,
  onRetry,
  empty,
}: {
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  empty?: boolean;
}) {
  if (loading)
    return (
      <p role="status" className={styles.empty}>
        Cargando registros verificados…
      </p>
    );
  if (error)
    return (
      <div role="alert" className={styles.empty}>
        <p>{error}</p>
        <button type="button" onClick={onRetry}>
          Reintentar
        </button>
      </div>
    );
  return empty ? (
    <p className={styles.empty}>
      No hay registros publicados con esta selección. La ausencia no acredita un
      monto cero.
    </p>
  ) : null;
}
