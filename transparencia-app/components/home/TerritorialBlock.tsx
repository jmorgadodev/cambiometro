import Link from "next/link";
import Icono from "@/components/ui/Icono";

interface TerritorialBlockProps {
  renuncias: number;
  verificados: number;
  enConfirmacion: number;
}

export default function TerritorialBlock({ renuncias, verificados, enConfirmacion }: TerritorialBlockProps) {
  return (
    <section className="editorial-territory-section editorial-section" aria-labelledby="territory-title">
      <div className="container-main editorial-territory-layout">
        <div className="editorial-territory-copy">
          <p className="eyebrow"><Icono nombre="territorio" size={16} /> Territorio y cobertura nacional</p>
          <h2 id="territory-title">Fiscalización desde Arica hasta Magallanes.</h2>
          <p>Las fichas territoriales reúnen datos oficiales de las 346 comunas de Chile. Puedes revisar alcaldías, demografía, finanzas y compras con la fuente de cada registro.</p>
          <div className="editorial-territory-facts">
            <Link prefetch={false} href="/municipalidades"><strong>346</strong><span>comunas con ficha</span></Link>
            <Link prefetch={false} href="/municipalidades"><strong>INE 2024</strong><span>datos censales</span></Link>
            <Link prefetch={false} href="/movimientos"><strong>{renuncias}</strong><span>renuncias registradas</span></Link>
          </div>
          <Link prefetch={false} className="btn btn-primary" href="/municipalidades">Explorar comunas <span aria-hidden="true">→</span></Link>
          <small>{verificados} movimientos verificados; {enConfirmacion} en confirmación. <Link prefetch={false} href="/movimientos">Ver movimientos</Link></small>
        </div>
        <div className="editorial-territory-visual" role="img" aria-label="Paisaje de la Patagonia chilena">
          <div><span>Democracia territorial</span><p>La evidencia pública también debe poder leerse desde cada comuna.</p></div>
        </div>
      </div>
    </section>
  );
}
