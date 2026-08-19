export function requiredProjectionKeys(
  catalog: { sources?: Array<{ id: string; entityKey?: string; entityIndexKey?: string }> },
  requestedSources?: string[],
): string[];
