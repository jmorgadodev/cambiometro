import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import GastosOperacionalesExplorerClient from "@/components/GastosOperacionalesExplorerClient";
import type { ExpenseSummary } from "@/components/GastosOperacionalesExplorerClient";

export const metadata: Metadata = {
  title: "Gastos Operacionales Rendidos — El Cambiómetro",
  description: "Consulta los gastos operacionales integrados de la Cámara y el Senado, con períodos disponibles, montos informados y enlaces a las fuentes oficiales.",
  alternates: { canonical: "/gastos-operacionales" },
};

export default function GastosOperacionalesPage() {
  const summary = JSON.parse(readFileSync(join(process.cwd(), "data/generated/gastos-operacionales-summary.json"), "utf8")) as ExpenseSummary;
  // La suma bruta de filas no acredita un gasto consolidado: no serializarla.
  const publicSummary: ExpenseSummary = {
    totalRows: summary.totalRows,
    montoNoInformado: summary.montoNoInformado,
    bySource: summary.bySource,
    periodsBySource: summary.periodsBySource,
  };
  return <GastosOperacionalesExplorerClient summary={publicSummary} />;
}
