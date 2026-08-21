export function launchFirstAvailable<T>(
  candidates: string[],
  launch: (executable: string) => Promise<T>,
  onFailure?: (executable: string, message: string) => void,
): Promise<T>;
