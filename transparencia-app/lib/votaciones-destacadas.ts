import entries from "../data/votaciones-destacadas.json";

export interface VotacionDestacada {
  votacion_id: string;
  boletin: string;
  camara: "Cámara" | "Senado";
  fecha: string;
  titulo: string;
  resumen: string;
  resultado: "Aprobado" | "Rechazado" | "En trámite" | "Retirado";
  tags: string[];
  fuente_url: string;
}

export const VOTACIONES_DESTACADAS = entries as VotacionDestacada[];
