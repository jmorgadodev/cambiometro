import Link from "next/link";
import HomeInlineSearch from "@/components/HomeInlineSearch";
import { ArrowRight, FileText, HeartHandshake, MapPin, TrendingUp, User, Vote } from "./Icons";

const DIRECT_EXPLORATION_ITEMS = [
  { label: "Personas públicas", href: "/personas", icon: User },
  { label: "Remuneraciones", href: "/remuneraciones-publicas", icon: TrendingUp },
  { label: "Compras públicas", href: "/datos?cat=compras", icon: FileText },
  { label: "Transferencias", href: "/transferencias", icon: HeartHandshake },
  { label: "Votaciones", href: "/votaciones-destacadas", icon: Vote },
  { label: "Municipios", href: "/municipalidades", icon: MapPin },
] as const;

export function SearchBar() {
  return (
    <section id="buscador" className="editorial-search-hub" aria-labelledby="home-search-heading">
      <div className="editorial-search-hub__card">
        <p className="eyebrow">BUSCA EN LOS DATOS PÚBLICOS</p>
        <h2 id="home-search-heading">Encuentra la evidencia pública</h2>
        <p>Busca registros publicados y revisa su fuente original.</p>
        <HomeInlineSearch />
        <div className="mt-6 pt-5 border-t border-border">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-wider text-text-3 mb-3">Explora directamente</h3>
          <div className="grid grid-cols-1 min-[460px]:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {DIRECT_EXPLORATION_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link key={item.label} href={item.href} prefetch={false} className="group flex items-center justify-between px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl bg-surface-2 border border-border hover:border-accent hover:bg-surface transition-all shadow-xs hover:shadow-sm">
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="p-1 rounded bg-ok-bg text-accent shrink-0"><Icon className="w-3.5 h-3.5" /></span>
                    <span className="text-xs sm:text-sm font-semibold text-text-1">{item.label}</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-text-3 transition-transform group-hover:translate-x-1 group-hover:text-accent shrink-0 ml-2" />
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SearchBar;
