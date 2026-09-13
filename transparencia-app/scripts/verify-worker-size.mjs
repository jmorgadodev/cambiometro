import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const tempDir = mkdtempSync(join(tmpdir(), "cambiometro-worker-size-"));
const metafile = join(tempDir, "bundle-meta.json");

try {
  execFileSync(
    process.execPath,
    [
      join(root, "node_modules", "wrangler", "bin", "wrangler.js"),
      "deploy",
      "--config",
      "workers/public-api/wrangler.jsonc",
      "--env",
      "preview",
      "--dry-run",
      "--outdir",
      tempDir,
      "--metafile",
      metafile,
    ],
    { cwd: root, stdio: "inherit" },
  );

  const bundle = JSON.parse(readFileSync(metafile, "utf8"));
  const bytes = Object.entries(bundle.outputs ?? {})
    .filter(([file]) => !file.endsWith(".map"))
    .reduce((sum, [, output]) => sum + Number(output.bytes ?? 0), 0);
  console.log(JSON.stringify({ workerBytes: bytes, limitBytes: 1_000_000 }));
  if (bytes >= 1_000_000) throw new Error(`Worker supera 1 MB: ${bytes} bytes`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
