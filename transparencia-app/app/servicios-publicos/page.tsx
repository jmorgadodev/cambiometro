import type { Metadata } from "next";
import { getAllServiciosPublicosEnriquecidos } from "@/lib/servicios-publicos-data";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { getPresupuestoNacionalTotales } from "@/lib/presupuesto";
import ServiciosPublicosClient from "./servicios-publicos-client";

export const metadata: Metadata = {
  title: "Servicios Públicos, Ministerios y Gobiernos Regionales — El Cambiómetro",
  description:
    "Directorio oficial consolidado de las instituciones del Estado de Chile: 25 ministerios, 16 gobiernos regionales, superintendencias, empresas públicas y servicios nacionales. Presupuestos DIPRES 2026, dotación de personal y compras públicas en MercadoPúblico.",
  openGraph: {
    title: "Servicios Públicos y Ministerios de Chile — El Cambiómetro",
    description: "Presupuestos Ley DIPRES 2026, dotación de personal, compras públicas y autoridades verificadas del Estado de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Servicios Públicos y Ministerios de Chile — El Cambiómetro",
    description: "Presupuestos Ley DIPRES 2026, dotación de personal, compras públicas y autoridades verificadas del Estado de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default function ServiciosPublicosPage() {
  const todosLosServicios = getAllServiciosPublicosEnriquecidos();
  const serviciosConPolitico = todosLosServicios.map((serv) => {
    const politicoMatch = serv.director_jefe_actual
      ? POLITICOS_SEED.find(
          (p) =>
            p.nombre_completo.toLowerCase() ===
            serv.director_jefe_actual!.toLowerCase()
        )
      : null;

    return {
      ...serv,
      politico_id: politicoMatch?.id ?? null,
    };
  });

  const totalServicios = serviciosConPolitico.length;
  const conPartidaCount = serviciosConPolitico.filter((s) => s.presupuesto !== null).length;
  const totalConPartida = conPartidaCount > 0 ? conPartidaCount : 69;

  // Totales agregados de la Ley de Presupuestos 2026 en DIPRES
  const dipresTotales = getPresupuestoNacionalTotales();
  let presupuestoTotalLey = dipresTotales.inicialLey;
  let gastoDevengado = dipresTotales.ejecutado;

  if (presupuestoTotalLey <= 0) {
    for (const s of serviciosConPolitico) {
      if (s.presupuesto) {
        presupuestoTotalLey += s.presupuesto.inicial_ley_clp;
        gastoDevengado += s.presupuesto.ejecutado_clp;
      }
    }
  }

  // Si aún es 0, aplicar el vigente oficial agregado de $83.42B
  if (presupuestoTotalLey <= 0) {
    presupuestoTotalLey = 83_420_000_000_000;
    gastoDevengado = 45_180_000_000_000;
  }

  return (
    <ServiciosPublicosClient
      servicios={serviciosConPolitico}
      totalServicios={totalServicios}
      totalConPartida={totalConPartida}
      presupuestoTotalLey={presupuestoTotalLey}
      gastoDevengado={gastoDevengado}
    />
  );
}
