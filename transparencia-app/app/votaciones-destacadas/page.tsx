import type { Metadata } from "next";
import VotacionesDestacadasClient from "@/components/VotacionesDestacadasClient";
import { VOTACIONES_DESTACADAS } from "@/lib/votaciones-destacadas";

export const metadata: Metadata = {
  title: "Votaciones destacadas — El Cambiómetro",
  description: "Selección editorial de votaciones nominales verificables del Congreso Nacional.",
};

export default function VotacionesDestacadasPage() {
  return <VotacionesDestacadasClient entries={VOTACIONES_DESTACADAS} />;
}
