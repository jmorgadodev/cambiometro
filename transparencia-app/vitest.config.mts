import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@/lib/snapshot",
        replacement: path.resolve(projectRoot, "fixtures/snapshot-test.ts"),
      },
      {
        find: "@",
        replacement: path.resolve(projectRoot),
      },
    ],
  },
  test: {
    include: ["lib/**/*.test.ts", "workers/**/*.test.ts", "scripts/static-site-inputs.test.mjs", "scripts/expense-release.test.mjs", "scripts/movimientos-pipeline.test.mjs", "scripts/etl/transfer-release-cutoff.test.mjs", "scripts/etl/connectors/**/*.test.mjs"],
  },
});
