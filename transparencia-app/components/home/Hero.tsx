import Link from "next/link";
import Icono from "@/components/ui/Icono";
import HeroPhotography from "@/components/home/HeroPhotography";

export default function Hero() {
  return (
    <section className="editorial-hero" aria-labelledby="home-title">
      <div className="container-main editorial-hero__grid">
        <div className="editorial-hero__copy">
          <p className="editorial-kicker"><span aria-hidden="true" /> Datos abiertos · fiscalización ciudadana</p>
          <h1 id="home-title">Un Chile más transparente <em>es posible.</em></h1>
          <p className="editorial-hero__intro">
            Exploramos, visualizamos y conectamos información pública oficial para que cualquier persona
            pueda entender, comparar y auditar las decisiones, gastos y votaciones en el Estado de Chile.
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

        <HeroPhotography />
      </div>
    </section>
  );
}
