import type { Metadata } from "next";
import GastosOperacionalesExplorerClient from "@/components/GastosOperacionalesExplorerClient";

export const metadata: Metadata = {
  title: "Gastos Operacionales Rendidos — El Cambiómetro",
  description: "Consulta el universo completo de gastos operacionales rendidos por la Cámara y el Senado, con período, monto y enlace a la fuente oficial.",
  alternates: { canonical: "/gastos-operacionales" },
};

export default function GastosOperacionalesPage() {
  return <GastosOperacionalesExplorerClient />;
}
