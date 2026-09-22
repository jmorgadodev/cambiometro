const sections = [
  { href: "#costo-mensual", label: "Costo mensual" },
  { href: "#seccion-electoral", label: "Elección 2025" },
  { href: "#seccion-gastos", label: "Gastos rendidos" },
  { href: "#seccion-asesores", label: "Personal y asesores" },
  { href: "#seccion-trayectoria", label: "Trayectoria" },
  { href: "#seccion-votaciones", label: "Votaciones" },
] as const;

export default function AuthoritySectionNav() {
  return (
    <nav className="authority-section-nav" aria-label="Secciones de la ficha de autoridad">
      <div className="container-main authority-section-nav__inner">
        <span className="authority-section-nav__label">Expediente</span>
        <div className="authority-section-nav__links">
          {sections.map((section, index) => (
            <a key={section.href} href={section.href}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
              {section.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
