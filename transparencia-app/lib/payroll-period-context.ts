const CPLT_MONTHLYIZED_CUTOFF = "2025-03";

export const CPLT_PAYROLL_GUIDE_URL =
  "https://www.consejotransparencia.cl/portal-de-transparencia/guia-pte-publicacion-remuneraciones/";

export function getPayrollPeriodContext(period: string) {
  const isValidMonth = /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
  const isCpltMonthlyizedPeriod = isValidMonth && period <= CPLT_MONTHLYIZED_CUTOFF;

  return {
    isCpltMonthlyizedPeriod,
    message: isCpltMonthlyizedPeriod
      ? `Período: ${period}. Para planillas hasta marzo de 2025, el CPLT indica que el monto bruto publicado es mensualizado; el registro no acredita cargo vigente.`
      : `Período: ${period}. El monto corresponde al período reportado y no acredita que la persona siga en el cargo.`,
  };
}
