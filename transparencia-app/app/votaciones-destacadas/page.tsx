import type { Metadata } from "next";
import VotacionesDestacadasClient from "@/components/VotacionesDestacadasClient";
import { getVotingFreshness, getVotacionDestacadaDetalle, getVotacionesAnuales, VOTACIONES_DESTACADAS } from "@/lib/votaciones-destacadas";

export const metadata: Metadata = {
  title: "Votaciones parlamentarias — El Cambiómetro",
  description: "Registro completo de votaciones nominales verificables de la Cámara y el Senado.",
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
