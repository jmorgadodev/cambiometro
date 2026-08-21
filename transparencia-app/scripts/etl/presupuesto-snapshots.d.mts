export interface BudgetSubtitleSnapshot {
  period: string;
  subtitulo: string;
  denominacion: string;
  inicial: number;
  vigente: number;
  ejecutado: number;
}

export function latestBudgetSnapshot(records: BudgetSubtitleSnapshot[]): {
  period: string | null;
  subtitulos: Array<Omit<BudgetSubtitleSnapshot, "period">>;
};
