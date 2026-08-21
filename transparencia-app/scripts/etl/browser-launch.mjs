export async function launchFirstAvailable(candidates, launch, onFailure = () => {}) {
  const failures = [];
  for (const executable of candidates) {
    try {
      return await launch(executable);
    } catch (error) {
      const message = String(error?.message ?? error);
      failures.push(message);
      onFailure(executable, message);
    }
  }
  throw new Error(`CAMARA_GASTOS_BROWSER_LAUNCH_FAILED:${failures.join(" | ")}`);
}
