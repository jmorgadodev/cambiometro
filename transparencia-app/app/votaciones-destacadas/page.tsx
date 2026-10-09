import type { Metadata } from "next";
import VotacionesDestacadasClient from "@/components/VotacionesDestacadasClient";
import { getVotingFreshness, getVotacionDestacadaDetalle, getVotacionesAnuales, VOTACIONES_DESTACADAS } from "@/lib/votaciones-destacadas";

export const metadata: Metadata = {
  title: "Votaciones parlamentarias — El Cambiómetro",
  description: "Votaciones incorporadas de Cámara y Senado por fecha y fuente. Los detalles nominales no conciliados están en revisión; no se acredita cobertura completa.",
  alternates: { canonical: "/votaciones-destacadas" },
};

export default function VotacionesDestacadasPage() {
  const freshness = getVotingFreshness();
  const annualEntries = getVotacionesAnuales();
  const details = Object.fromEntries(
    VOTACIONES_DESTACADAS.flatMap((entry) => {
      const detail = getVotacionDestacadaDetalle(entry.votacion_id);
      return detail ? [[entry.votacion_id, detail] as const] : [];
    }),
  );
  return <VotacionesDestacadasClient entries={VOTACIONES_DESTACADAS} annualEntries={annualEntries} details={details} freshness={freshness} />;
}
