import { describe, expect, it } from "vitest";
import { main } from "../scripts/prepare-senate-expenses-local.mjs";

describe("preparación local de gastos Senado", () => {
  it("rechaza publicar y exige una salida aislada antes de consultar el origen", async () => {
    await expect(main(["--publish"])).rejects.toThrow("SENATE_PREPARE_ARGUMENTS_INVALID");
    await expect(main(["--candidate-dir", "data/lake-subsets"])).rejects.toThrow("OUTPUT_OUTSIDE_ARTIFACTS");
    await expect(main(["--candidate-dir", "artifacts/expense-candidates/senate-missing-manifest-test"])).rejects.toThrow("MANIFEST_REQUIRED");
  });
});
