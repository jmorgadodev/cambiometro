import Link from "next/link";
import HomeInlineSearch from "@/components/HomeInlineSearch";

const destinations = [
  { label: "Personas", href: "/personas" },
  { label: "Remuneraciones", href: "/remuneraciones-publicas" },
  { label: "Compras públicas", href: "/cruces" },
  { label: "Transferencias", href: "/transferencias" },
  { label: "Votaciones", href: "/votaciones-destacadas" },
  { label: "Municipios", href: "/municipalidades" },
];

export default function SearchHub() {
  return (
    <section id="buscador" className="editorial-search-hub" aria-labelledby="home-search-title">
      <div className="editorial-search-hub__card">
        <p className="eyebrow">Busca en los datos públicos</p>
        <h2 id="home-search-title">Encuentra la evidencia pública</h2>
        <p>Busca entre los registros disponibles y revisa su fuente original.</p>
        <HomeInlineSearch />
        <nav className="editorial-search-hub__links" aria-label="Explorar por sección">
          {destinations.map((item) => <Link prefetch={false} key={item.href} href={item.href}>{item.label} <span aria-hidden="true">↗</span></Link>)}
        </nav>
      </div>
    </section>
  );
}
