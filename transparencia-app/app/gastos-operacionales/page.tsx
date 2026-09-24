import type { Metadata } from "next";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import GastosOperacionalesExplorerClient from "@/components/GastosOperacionalesExplorerClient";
import type { ExpenseSummary } from "@/components/GastosOperacionalesExplorerClient";

export const metadata: Metadata = {
  title: "Gastos Operacionales Rendidos — El Cambiómetro",
  description: "Consulta el universo completo de gastos operacionales rendidos por la Cámara y el Senado, con período, monto y enlace a la fuente oficial.",
  alternates: { canonical: "/gastos-operacionales" },
};

export default function GastosOperacionalesPage() {
  const summary = JSON.parse(readFileSync(join(process.cwd(), "data/generated/gastos-operacionales-summary.json"), "utf8")) as ExpenseSummary;
  return <GastosOperacionalesExplorerClient summary={summary} />;
}
