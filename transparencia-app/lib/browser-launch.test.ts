import { describe, expect, it, vi } from "vitest";
import { launchFirstAvailable } from "../scripts/etl/browser-launch.mjs";

describe("ETL Cámara — selección de navegador ejecutable", () => {
  it("continúa con el siguiente ejecutable cuando el primero existe pero no inicia", async () => {
    const launch = vi.fn(async (executable: string) => {
      if (executable === "edge") throw new Error("DevTools endpoint unavailable");
      return { executable };
    });
    await expect(launchFirstAvailable(["edge", "chrome"], launch)).resolves.toEqual({ executable: "chrome" });
    expect(launch.mock.calls.map(([executable]) => executable)).toEqual(["edge", "chrome"]);
  });

  it("informa todos los fallos cuando ningún navegador puede iniciar", async () => {
    await expect(launchFirstAvailable(["edge", "chrome"], async (executable) => {
      throw new Error(`${executable}: failure`);
    })).rejects.toThrow("CAMARA_GASTOS_BROWSER_LAUNCH_FAILED:edge: failure | chrome: failure");
  });
});
