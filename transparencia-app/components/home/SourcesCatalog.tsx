import Link from "next/link";
import Icono from "@/components/ui/Icono";
import type { HomeSource } from "./types";

interface SourcesCatalogProps {
  sources: HomeSource[];
  updatedAt: string;
}

export default function SourcesCatalog({ sources, updatedAt }: SourcesCatalogProps) {
  return (
    <section className="container-main editorial-section editorial-sources" aria-labelledby="sources-title">
      <header className="editorial-heading">
        <div><p className="eyebrow">Infraestructura de datos públicos</p><h2 id="sources-title">{sources.length} fuentes bajo un estándar documental</h2></div>
        <Link prefetch={false} href="/datos">Revisar todas las fuentes →</Link>
      </header>
      <p className="editorial-section__intro">Cada fuente conserva su propio corte, alcance y procedencia. Última consolidación de esta portada: {updatedAt}.</p>
      <div className="editorial-sources__ledger">
        <div className="editorial-sources__head" aria-hidden="true"><span>Fuente oficial</span><span>Organismo</span><span>Registros</span><span>Actualización</span></div>
        {sources.map((source, index) => (
          <Link prefetch={false} href={source.viewLink} key={source.id}>
            <span className="editorial-sources__name"><b>{String(index + 1).padStart(2, "0")}</b><strong>{source.name}</strong><small>{source.statusText || "Disponible"}</small></span>
            <span>{source.organization}</span>
            <span className="editorial-sources__count">{source.recordCount.toLocaleString("es-CL")}</span>
            <span>{source.frequency}<Icono nombre="arrow-right" size={15} /></span>
          </Link>
        ))}
      </div>
      <p className="editorial-sources__note"><Icono nombre="shield" size={18} /><span><strong>Cómo leer este catálogo.</strong> Son 12 fuentes oficiales y 1 derivada, con registros publicados y consultables según la evidencia disponible. Cuando una métrica no tiene evidencia suficiente se muestra “No calculable”.</span><Link prefetch={false} href="/fuentes">Ver metodología →</Link></p>
    </section>
  );
}
