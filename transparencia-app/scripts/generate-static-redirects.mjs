import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const politicoRedirects = JSON.parse(await readFile(join(root, "data", "generated", "politico-redirects.json"), "utf8").catch(() => "[]"));
const redirects = [
  "/autoridades /personas?tab=parlamentarios 301",
  "/funcionarios /personas?tab=funcionarios 301",
  "/municipalidades/muni-maipu /municipalidades/maipu 301",
  ...politicoRedirects.map(({ from, to }) => `/politico/${from} /politico/${to} 301`),
].join("\n") + "\n";
await writeFile(join(root, "public", "_redirects"), redirects);
await mkdir(join(root, "out"), { recursive: true });
await writeFile(join(root, "out", "_redirects"), redirects);
