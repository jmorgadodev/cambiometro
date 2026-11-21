import type { Metadata } from "next";
import { Suspense } from "react";
import ParliamentaryExplorer from "@/components/dashboard/explorer/ParliamentaryExplorer";
import { loadExplorerBootstrap } from "@/lib/parliamentary-explorer-data";
export const metadata: Metadata = {
  title: "Dashboard parlamentario | El Cambiómetro",
  description:
    "Explora y compara gastos operacionales, equipos, cargos y registros de Cámara y Senado con fuentes y cobertura desde 2026.",
  alternates: { canonical: "/dashboard" },
};
export default function DashboardPage() {
  const data = loadExplorerBootstrap();
  return data ? (
    <Suspense
      fallback={<p role="status">Preparando el explorador parlamentario…</p>}
    >
      <ParliamentaryExplorer bootstrap={data} />
    </Suspense>
  ) : (
    <section className="container-main">
      <h1>Explorador parlamentario</h1>
      <p>
        El release verificado aún no está preparado en este entorno. No se
        sustituyen sus datos por copias antiguas.
      </p>
    </section>
  );
}
