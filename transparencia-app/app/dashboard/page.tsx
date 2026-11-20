import { DASHBOARD_CATALOG } from "@/lib/dashboard-catalog";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/components/dashboard/ParliamentaryDashboard.module.css";
import ParliamentaryDashboard from "@/components/dashboard/ParliamentaryDashboard";
import { loadParliamentaryDashboard } from "@/lib/parliamentary-dashboard-data";

export const metadata: Metadata = { title: "Dashboard parlamentario | El Cambiómetro", description: "Explora gastos operacionales, personal, asesorías y dietas oficiales por cámara, parlamentario, período e ítem desde 2026.", alternates: { canonical: "/dashboard" } };
export default async function DashboardPage() {
  const data = await loadParliamentaryDashboard();
  return <div><section className="page-masthead"><div className="container-main"><p className="eyebrow">Cámara y Senado · datos desde 2026</p><h1>Dashboard parlamentario</h1><p>Explora cómo cambian los recursos publicados. Filtra, compara períodos y revisa el detalle de cada componente.</p><Link className={styles.backLink} href="/politico">← Volver a Cámara</Link></div></section><div className="container-main"><nav className={styles.catalog} aria-label="Dashboards disponibles">{DASHBOARD_CATALOG.map(panel => <Link className={styles.catalogLink} key={panel.id} href={panel.id === "parlamentario" ? "#dashboard-workspace" : panel.href} aria-current={panel.id === "parlamentario" ? "page" : undefined}><strong>{panel.title}</strong><span>{panel.description}</span><small>Panel actual · 2026 en adelante</small></Link>)}</nav><Suspense fallback={<p role="status">Preparando filtros del dashboard…</p>}><ParliamentaryDashboard data={data} /></Suspense></div></div>;
}
