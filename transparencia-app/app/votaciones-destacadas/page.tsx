import type { Metadata } from "next";
import VotacionesDestacadasClient from "@/components/VotacionesDestacadasClient";
import { getVotacionDestacadaDetalle, VOTACIONES_DESTACADAS } from "@/lib/votaciones-destacadas";

export const metadata: Metadata = {
  title: "Votaciones destacadas — El Cambiómetro",
  description: "Selección editorial de votaciones nominales verificables del Congreso Nacional.",
};

export default function VotacionesDestacadasPage() {
  const details = Object.fromEntries(
    VOTACIONES_DESTACADAS.flatMap((entry) => {
      const detail = getVotacionDestacadaDetalle(entry.votacion_id);
      return detail ? [[entry.votacion_id, detail] as const] : [];
    }),
  );
  return <VotacionesDestacadasClient entries={VOTACIONES_DESTACADAS} details={details} />;
}
