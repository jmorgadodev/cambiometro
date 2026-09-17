function lowerBound(values: number[], target: number) {
  let low = 0, high = values.length;
  while (low < high) {
    const middle = low + Math.floor((high - low) / 2);
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }
  return low;
}

export function intersectSortedPositions(lists: number[][]): number[] {
  if (!lists.length) return [];
  const ordered = [...lists].sort((a, b) => a.length - b.length);
  return ordered.slice(1).reduce((candidates, values) => {
    if (candidates.length * 16 < values.length) return candidates.filter(position => values[lowerBound(values, position)] === position);
    const result:number[] = [];
    let left = 0, right = 0;
    while (left < candidates.length && right < values.length) {
      if (candidates[left] === values[right]) { result.push(candidates[left++]); right++; }
      else if (candidates[left] < values[right]) left++;
      else right++;
    }
    return result;
  }, ordered[0]);
}

export function subtractSortedPositions(candidates: number[], excluded: number[]) {
  return candidates.filter(position => excluded[lowerBound(excluded, position)] !== position);
}

/** Select a small public page without allocating millions of positions. */
export function positionsWithoutExcluded(total: number, excluded: number[], offset: number, limit: number) {
  const result: number[] = [];
  let position = offset;
  for (const value of excluded) {
    if (value > position) break;
    position++;
  }
  let exclusionIndex = lowerBound(excluded, position);
  while (position < total && result.length < limit) {
    if (excluded[exclusionIndex] === position) exclusionIndex++;
    else result.push(position);
    position++;
  }
  return result;
}
