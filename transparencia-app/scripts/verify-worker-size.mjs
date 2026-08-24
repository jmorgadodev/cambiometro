import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const metafile = join(root, "workers", "public-api", "dist", "bundle-meta.json");
if (!existsSync(metafile)) {
  execFileSync(process.execPath, [join(root, "node_modules", "wrangler", "bin", "wrangler.js"), "deploy", "--config", "workers/public-api/wrangler.jsonc", "--dry-run", "--outdir", "dist", "--metafile", metafile], { cwd: root, stdio: "inherit" });
}
const bundle = JSON.parse(readFileSync(metafile, "utf8"));
const bytes = Object.values(bundle.outputs ?? {}).reduce((sum, output) => sum + Number(output.bytes ?? 0), 0);
console.log(JSON.stringify({ workerBytes: bytes, limitBytes: 1_000_000 }));
if (bytes >= 1_000_000) throw new Error(`Worker supera 1 MB: ${bytes} bytes`);
