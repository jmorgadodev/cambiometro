import type { Metadata } from "next";
import Link from "next/link";
import { ACTIVE_MODULES, CONSTRUCTION_MODULES } from "@/lib/site-modules";
import PublicationScopeNotice from "@/components/data/PublicationScopeNotice";

export const CONSTRUCTION_METADATA: Metadata = {
  title: "Módulo en construcción — El Cambiómetro",
  description: "Este módulo está siendo revisado antes de volver a publicarse.",
  robots: { index: false, follow: true },
};

export default function ModuleUnderConstruction({ moduleId }: { moduleId: string }) {
  const siteModule = CONSTRUCTION_MODULES.find((item) => item.id === moduleId);
  const label = siteModule?.label ?? "Este módulo";

  return (
    <main className="construction-page" aria-labelledby="construction-title">
      <PublicationScopeNotice area="datos" />
      <div className="container-main construction-page__inner">
        <p className="eyebrow">En desarrollo</p>
        <h1 id="construction-title">{label} está en construcción</h1>
        <p className="construction-page__lead">
          Estamos ordenando sus fuentes y validaciones antes de volver a mostrarlo. La dirección se mantiene disponible para no romper enlaces existentes.
        </p>
        <div className="construction-page__status" role="status">
          <span aria-hidden="true" />
          <strong>Revisión de datos y experiencia en curso</strong>
        </div>
        <div className="construction-page__actions">
          <Link href="/" prefetch={false} className="btn btn-ghost">Volver al inicio</Link>
          <Link href="/datos" prefetch={false} className="btn btn-primary">Revisar estado de los datos</Link>
        </div>
        <nav className="construction-page__active" aria-label="Áreas disponibles">
          <h2>Mientras tanto, estas áreas están disponibles</h2>
          <ul>
            {ACTIVE_MODULES.map((item) => (
              <li key={item.id}>
                <Link href={item.href} prefetch={false}>
                  <strong>{item.label}</strong>
                  <span>{item.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  );
}
