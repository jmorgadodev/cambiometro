import { sourceStateChecksum } from "./materialize.mjs";

export function sourceChecksums(sources, partitions) {
  return new Map(sources.map((source) => [source.id, sourceStateChecksum(source, partitions)]));
}

export function changedSources(sources, partitions, previousStates) {
  const checksums = sourceChecksums(sources, partitions);
  return sources.filter((source) => {
    const checksum = checksums.get(source.id);
    const previous = previousStates.get(source.id);
    return !checksum || !previous || previous.checksum_sha256 !== checksum;
  });
}

