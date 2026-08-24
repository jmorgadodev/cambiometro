import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const redirects = `/autoridades /personas?tab=parlamentarios 301\n/funcionarios /personas?tab=funcionarios 301\n/municipalidades/muni-maipu /municipalidades/maipu 301\n`;
await writeFile(join(root, "public", "_redirects"), redirects);
await mkdir(join(root, "out"), { recursive: true });
await writeFile(join(root, "out", "_redirects"), redirects);
