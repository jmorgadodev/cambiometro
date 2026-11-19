export interface DatedPartyMembership {
  desde?: string;
  hasta?: string;
  partido_id: string;
}
export function isValidVoteDate(value: unknown): value is string;
export function partyAtVoteDate(person: { militancias?: readonly DatedPartyMembership[] } | null | undefined, date: unknown): string | null;
