export interface ChileCompraBuyerR10 {
  id?: string;
  name?: string | null;
  rut_juridico?: string | null;
  monto_total_clp?: number | null;
  procesos?: number | null;
  top?: Array<Record<string, unknown>>;
}

export function findBuyerByVerifiedRut<T extends ChileCompraBuyerR10>(
  buyers: T[],
  legalRut: string | null | undefined,
): T | null;

export function projectOfficialBuyer(buyer: ChileCompraBuyerR10 | null | undefined): Record<string, unknown> | null;
