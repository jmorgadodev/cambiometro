import type { VotacionBancadaDetalle } from "./votaciones-destacadas";

export interface VotacionBancadaShare {
  key: "Afirmativo" | "En Contra" | "Abstención" | "No Vota";
  label: string;
  value: number;
  pct: number;
}

function roundOne(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Returns a complete, comparable composition for a party row. Percentages
 * use the whole current roster as denominator, so non-votes stay visible
 * instead of being silently folded into the effective vote share.
 */
export function getVotacionBancadaShares(party: VotacionBancadaDetalle): VotacionBancadaShare[] {
  const shares: VotacionBancadaShare[] = [
    { key: "Afirmativo", label: "A favor", value: party.afirmativo, pct: 0 },
    { key: "En Contra", label: "En contra", value: party.enContra, pct: 0 },
    { key: "Abstención", label: "Abstención", value: party.abstencion, pct: 0 },
    { key: "No Vota", label: "No vota", value: party.noVota, pct: 0 },
  ];
  const total = party.miembros;
  if (total <= 0) return shares;

  for (const share of shares) share.pct = roundOne((share.value / total) * 100);
  const largest = shares.reduce((best, share, index) => share.value > shares[best].value ? index : best, 0);
  shares[largest].pct = roundOne(shares[largest].pct + (100 - shares.reduce((sum, share) => sum + share.pct, 0)));
  return shares;
}
