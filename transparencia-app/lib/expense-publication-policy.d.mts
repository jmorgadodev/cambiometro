export type PublicExpenseSource = "gastos_camara" | "gastos_senado";

export const PUBLIC_EXPENSE_EXCLUDED_PERIODS: Partial<Record<PublicExpenseSource, readonly string[]>>;

export function isPublicExpensePeriod(source: PublicExpenseSource, period: string): boolean;
