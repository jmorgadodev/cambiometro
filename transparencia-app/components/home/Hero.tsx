import Link from "next/link";
import HomeInlineSearch from "@/components/HomeInlineSearch";
import Icono from "@/components/ui/Icono";

interface HeroProps {
  updatedAt: string;
  records: number;
  entities: number;
  sourceCount: number;
}

export default function Hero({ updatedAt, records, entities, sourceCount }: HeroProps) {
  return (
    <section className="editorial-hero" aria-labelledby="home-title">
      <div className="editorial-grid" aria-hidden="true" />
      <div className="container-main editorial-hero__grid">
        <div className="editorial-hero__copy">
          <p className="editorial-kicker"><span aria-hidden="true" /> Datos abiertos · fiscalización ciudadana <small>{updatedAt}</small></p>
          <h1 id="home-title">La información pública <em>no debería perderse.</em></h1>
          <p className="editorial-hero__intro">
            Conectamos fuentes oficiales para que cualquier persona pueda buscar, comparar y auditar
            decisiones, gastos y votaciones del Estado de Chile.
          </p>
          <div className="editorial-hero__actions">
            <Link prefetch={false} className="btn btn-primary" href="#buscador">Explorar datos oficiales <span aria-hidden="true">→</span></Link>
            <Link prefetch={false} className="btn btn-ghost" href="/como-funciona">Cómo se valida la evidencia <span aria-hidden="true">↗</span></Link>
          </div>
          <div className="editorial-trust" aria-label="Principios de la plataforma">
            <span><Icono nombre="declaraciones" size={19} /><b>Fuentes oficiales</b><small>verificadas en origen</small></span>
            <span><Icono nombre="datos" size={19} /><b>Datos trazables</b><small>con corte por fuente</small></span>
            <span><Icono nombre="personas" size={19} /><b>Información abierta</b><small>para la ciudadanía</small></span>
          </div>
        </div>

        <aside className="editorial-dossier" aria-label="Buscador principal">
          <div className="editorial-dossier__topline"><span>Expediente público</span><b>ACTIVO</b></div>
          <p>Un punto de entrada para fiscalizar</p>
          <h2>Pregunta → fuente → evidencia</h2>
          <dl>
            <div><dt>Registros indexados</dt><dd>{records.toLocaleString("es-CL")}</dd></div>
            <div><dt>Entidades identificadas</dt><dd>{entities.toLocaleString("es-CL")}</dd></div>
            <div><dt>Fuentes conectadas</dt><dd>{sourceCount}</dd></div>
          </dl>
          <div id="buscador" className="editorial-dossier__search"><HomeInlineSearch /></div>
          <blockquote>“La información también es ciudadanía.”</blockquote>
        </aside>
      </div>
    </section>
  );
}
