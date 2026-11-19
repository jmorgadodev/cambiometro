import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import styles from "@/components/dashboard/ParliamentaryDashboard.module.css";
import ParliamentaryDashboard from "@/components/dashboard/ParliamentaryDashboard";
import { loadParliamentaryDashboard } from "@/lib/parliamentary-dashboard-data";

export const metadata: Metadata = { title: "Dashboard parlamentario | El Cambiómetro", description: "Explora gastos operacionales, personal, asesorías y dietas oficiales por cámara, parlamentario, período e ítem desde 2026.", alternates: { canonical: "/dashboard" } };
export default async function DashboardPage() {
  const data = await loadParliamentaryDashboard();
  return <div><section className="page-masthead"><div className="container-main"><p className="eyebrow">Cámara y Senado · datos desde 2026</p><h1>Dashboard parlamentario</h1><p>Explora cómo cambian los recursos publicados. Filtra, compara períodos y revisa el detalle de cada componente.</p><Link className={styles.backLink} href="/politico">← Volver a Cámara</Link></div></section><div className="container-main"><Suspense fallback={<p role="status">Preparando filtros del dashboard…</p>}><ParliamentaryDashboard data={data} /></Suspense></div></div>;
}
