import Link from "next/link";
import MechanicalCounter from "@/components/ui/MechanicalCounter";
import type { HomeMovementSummary } from "./types";

interface MovementsTimelineProps {
  summary: HomeMovementSummary;
  startLabel: string;
  lastEventLabel: string;
}

export default function MovementsTimeline({ summary, startLabel, lastEventLabel }: MovementsTimelineProps) {
  return (
    <section className="container-main editorial-section editorial-movements" aria-labelledby="movements-title">
      <header className="editorial-heading">
        <div><p className="eyebrow">Seguimiento de autoridades</p><h2 id="movements-title">Lo último que cambió en el Estado</h2></div>
        <Link prefetch={false} href="/movimientos">Ver historial completo →</Link>
      </header>
      <div className="editorial-movements__body">
        <div className="editorial-movements__summary">
          <span className="eyebrow">Registro público</span>
          <h3>Cambios que vale la pena seguir</h3>
          <p>Renuncias, nombramientos y cambios con su respaldo documental y estado de verificación.</p>
          <div className="editorial-movements__counters">
            <span><MechanicalCounter value={summary.total} /><small>movimientos</small></span>
            <span><MechanicalCounter value={summary.renuncias} /><small>renuncias</small></span>
            <span><MechanicalCounter value={summary.verificados} /><small>verificados</small></span>
            <span><MechanicalCounter value={summary.enConfirmacion} /><small>en confirmación</small></span>
          </div>
          <Link prefetch={false} href="/movimientos">Abrir movimientos y fuentes →</Link>
        </div>
        <div className="editorial-timeline" aria-label="Línea de tiempo de movimientos desde el 11 de marzo de 2026">
          <div className="editorial-timeline__line" aria-hidden="true" />
          <div><time>{startLabel}</time><b>Inicio del periodo</b></div>
          <div><time>{lastEventLabel}</time><b>Último cambio</b></div>
          <div><time>{summary.diasSinCambios} días</time><b>sin cambios al corte</b></div>
        </div>
      </div>
    </section>
  );
}
