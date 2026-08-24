import { Suspense } from "react";
import type { Metadata } from "next";
import { POLITICOS_SEED } from "@/lib/seed-politicos";
import { MUNICIPALIDADES_SEED } from "@/lib/municipalidades";
import { SERVICIOS_PUBLICOS_SEED } from "@/lib/servicios-publicos";
import { getAllOrganismos } from "@/lib/organismos";
import PersonasUniversalClient, {
  type ParlamentarioItem,
  type AlcaldeItem,
  type AutoridadItem,
  type OrganismoOption,
} from "@/components/personas/PersonasUniversalClient";
import fs from "node:fs";
import path from "node:path";

export const metadata: Metadata = {
  title: "Directorio Universal de Personas y Autoridades del Estado — El Cambiómetro",
  description:
    "Directorio consolidado de parlamentarios, autoridades y nóminas oficiales de personal, con cobertura declarada por organismo.",
  openGraph: {
    title: "Directorio de Personas del Estado de Chile — El Cambiómetro",
    description:
      "Registro de parlamentarios, alcaldes, ministros y nóminas de personal del Estado de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Directorio de Personas del Estado de Chile — El Cambiómetro",
    description:
      "Registro de parlamentarios, alcaldes, ministros y nóminas de personal del Estado de Chile.",
    images: ["https://cambiometro.impulsacv.cl/api/og/site"],
  },
};

export default function PersonasPage() {
  // 1. Parlamentarios
  const parlamentarios: ParlamentarioItem[] = POLITICOS_SEED.map((p) => {
    const isDip = p.cargo === "Diputado";
    const territory = isDip
      ? p.numero_distrito ? `Distrito ${p.numero_distrito}` : p.distrito_region
      : p.circunscripcion ? `Circunscripción ${p.circunscripcion}` : p.distrito_region;

    return {
      id: p.id,
      nombre_completo: p.nombre_completo,
      cargo_actual: p.cargo,
      partido_actual: p.partido_id.toUpperCase(),
      distrito_o_circunscripcion: territory || "Nacional",
      region: p.distrito_region || "Nacional",
      foto_url: p.foto_url,
    };
  });

  // 2. Alcaldes (con enriquecimiento de municipalidades-data.json si existe)
  let munisData: Record<
    string,
    {
      poblacion_censo_2024?: number;
      alcalde?: {
        nombre?: string;
        remuneracion_bruta?: number;
        remuneracion_liquida?: number;
        grado_eus?: string;
        formacion?: string;
        partido_alcalde?: string;
      };
    }
  > = {};
  try {
    const p = path.join(process.cwd(), "data", "municipalidades-data.json");
    if (fs.existsSync(p)) {
      munisData = JSON.parse(fs.readFileSync(p, "utf8"));
    }
  } catch {}

  const alcaldes: AlcaldeItem[] = MUNICIPALIDADES_SEED.flatMap((muni) => {
    const data = munisData[muni.id] || {};
    const alcaldeData = data.alcalde || {};
    const nombreAlcalde = alcaldeData.nombre || muni.alcalde_actual;
    if (!nombreAlcalde) return [];
    return [{
      muni_id: muni.id,
      cut: muni.cut,
      nombre_comuna: muni.nombre_comuna,
      region: muni.region,
      alcalde_nombre: nombreAlcalde,
      cargo: "Alcalde",
      remuneracion_bruta: alcaldeData.remuneracion_bruta ?? undefined,
      remuneracion_liquida: alcaldeData.remuneracion_liquida ?? undefined,
      grado_eus: alcaldeData.grado_eus,
      formacion: alcaldeData.formacion,
      partido_alcalde: alcaldeData.partido_alcalde || muni.partido_alcalde,
      poblacion_censo_2024: data.poblacion_censo_2024 ?? muni.poblacion_censo_2024 ?? undefined,
    }];
  });

  // 3. Altas Autoridades DIP
  const allOrganismos = getAllOrganismos();
  const organismosMap = new Map(allOrganismos.map((o) => [o.id, o]));

  const autoridades: AutoridadItem[] = SERVICIOS_PUBLICOS_SEED.map((serv) => {
    const org = organismosMap.get(serv.id);
    return {
      id: serv.id,
      nombre_canonico: serv.nombre,
      sigla: serv.sigla,
      tipo: serv.tipo_organo,
      director_jefe_actual: serv.director_jefe_actual,
      fuente_director: serv.fuente_director,
      ministerio_dependiente: serv.ministerio_dependiente,
      dotacion_total: org?.dotacion_total ?? null,
      partida_capitulo_dipres: org?.partida_capitulo_dipres || null,
      sitio_web_oficial: serv.sitio_web_oficial,
    };
  });

  // 4. Organismos canónicos para selectores
  const organismosOptions: OrganismoOption[] = allOrganismos.map((o) => ({
    id: o.id,
    nombre_canonico: o.nombre_canonico,
    sigla: o.sigla,
    tipo: o.tipo,
    region: o.region,
  }));

  return (
    <Suspense
      fallback={
        <div className="container-main" style={{ padding: "2.5rem 0 2rem", minHeight: "60vh" }}>
          <h1 style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", fontWeight: 900, color: "var(--text-1)", margin: "0 0 0.5rem 0" }}>
            Directorio de Personas del Estado
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-2)", margin: 0, lineHeight: 1.6 }}>
            Cargando catálogo consolidado de personas y autoridades...
          </p>
        </div>
      }
    >
      <PersonasUniversalClient
        parlamentarios={parlamentarios}
        alcaldes={alcaldes}
        autoridades={autoridades}
        organismos={organismosOptions}
        totalFuncionariosEstimados={1203287}
      />
    </Suspense>
  );
}
