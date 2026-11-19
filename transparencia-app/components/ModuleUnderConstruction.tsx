import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import PublicationScopeNotice from "@/components/data/PublicationScopeNotice";
import { CONSTRUCTION_MODULES } from "@/lib/site-modules";

export const CONSTRUCTION_METADATA: Metadata = {
  description: "Apartado en desarrollo: consulta los avances y datos publicados con sus limitaciones.",
  robots: { index: false, follow: true },
};

export default function ModuleUnderConstruction({moduleId,children}:{moduleId:string;children?:ReactNode}) {
  const label=CONSTRUCTION_MODULES.find(item=>item.id===moduleId)?.label ?? "Este apartado";
  return <>
    <PublicationScopeNotice area="datos" />
    <section className="container-main" aria-label="Aviso de apartado en desarrollo" role="note" style={{marginTop:"1rem",marginBottom:"1rem",padding:"1rem 1.25rem",border:"1px solid var(--border)",borderLeft:"3px solid var(--accent)",borderRadius:8,background:"var(--surface-2)",fontSize:".82rem",lineHeight:1.6}}>
      <strong>{label} está en construcción</strong>
      <p style={{margin:".35rem 0"}}>Puedes explorar los avances y el contenido disponible. Estamos mejorando este apartado; cada fuente conserva su último corte publicado y sus límites de cobertura.</p>
      <Link href="/datos" prefetch={false}>Revisar estado de los datos →</Link>{" · "}<Link href="/como-funciona/#alcance-publicacion" prefetch={false}>Cómo interpretar la información →</Link>
    </section>
    {children}
  </>;
}
