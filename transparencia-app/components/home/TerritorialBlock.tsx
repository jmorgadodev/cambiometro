import Link from "next/link";
import Icono from "@/components/ui/Icono";

interface TerritorialBlockProps {
  renuncias: number;
  verificados: number;
  enConfirmacion: number;
}

export default function TerritorialBlock({ renuncias, verificados, enConfirmacion }: TerritorialBlockProps) {
  return (
    <section className="container-main editorial-section" aria-labelledby="territory-title">
      <header className="editorial-heading">
        <div><p className="eyebrow">Territorio y actualidad</p><h2 id="territory-title">El Estado, visto desde el territorio</h2></div>
        <Link prefetch={false} href="/datos">Ver el catálogo de datos →</Link>
      </header>
      <div className="editorial-territory">
        <Link prefetch={false} href="/municipalidades"><Icono nombre="territorio" size={24} /><span>Municipios</span><strong>346 comunas con ficha territorial</strong><small>Demografía, alcaldías, finanzas y compras públicas.</small></Link>
        <Link prefetch={false} href="/movimientos"><Icono nombre="etl" size={24} /><span>Actualidad</span><strong>{renuncias} renuncias registradas</strong><small>{verificados} verificadas y {enConfirmacion} en confirmación.</small></Link>
        <Link prefetch={false} href="/municipalidades"><Icono nombre="datos" size={24} /><span>Datos censales</span><strong>INE Censo 2024 en el territorio</strong><small>Población, viviendas y hogares desde la fuente oficial.</small></Link>
      </div>
    </section>
  );
}
