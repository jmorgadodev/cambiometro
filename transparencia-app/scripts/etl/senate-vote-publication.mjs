export function senateVotePublicationReady(summary) {
  if (!Array.isArray(summary?.errores) || summary.errores.length
    || !Number.isSafeInteger(summary.votaciones_senado_ingresadas)
    || summary.votaciones_senado_ingresadas < 0) throw new Error("SENADO_PUBLICATION_STATUS_INVALID");
  return summary.votaciones_senado_ingresadas > 0;
}
