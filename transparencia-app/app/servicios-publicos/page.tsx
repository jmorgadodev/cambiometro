import type { Metadata } from "next";
import { getAllServiciosPublicosEnriquecidos } from "@/lib/servicios-publicos-data";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { getPresupuestoNacionalTotales } from "@/lib/presupuesto";
import ServiciosPublicosClient from "./servicios-publicos-client";

export const metadata: Metadata = {
  title: "Servicios Públicos, Ministerios y Gobiernos Regionales — El Cambiómetro",
  description:
    "Directorio oficial consolidado de las instituciones del Estado de Chile: 25 ministerios, 16 gobiernos regionales, superintendencias, empresas públicas y servicios nacionales. Presupuestos DIPRES 2026, dotación de personal y compras públicas en MercadoPúblico.",
  alternates: { canonical: "/servicios-publicos" },
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

import { Suspense } from "react";

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
  const totalConPartida = conPartidaCount;

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

  return (
    <Suspense
      fallback={
        <div className="container-main" style={{ padding: "2.5rem 0 2rem", minHeight: "60vh" }}>
          <h1
            style={{
              fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)",
              fontWeight: 900,
              color: "var(--text-1)",
              margin: "0 0 0.5rem",
              letterSpacing: "-0.02em",
            }}
          >
            Servicios Públicos, Ministerios y Gobiernos Regionales
          </h1>
          <p style={{ color: "var(--text-2)", fontSize: "0.95rem" }}>
            Cargando directorio oficial consolidado de instituciones del Estado...
          </p>
        </div>
      }
    >
      <ServiciosPublicosClient
        servicios={serviciosConPolitico}
        totalServicios={totalServicios}
        totalConPartida={totalConPartida}
        presupuestoTotalLey={presupuestoTotalLey}
        gastoDevengado={gastoDevengado}
      />
    </Suspense>
  );
}
