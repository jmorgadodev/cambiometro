import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const violations = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.(?:ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".test.ts")) {
      const source = readFileSync(file, "utf8");
      const name = relative(root, file);
      if (/force-dynamic|permanentRedirect\s*\(/.test(source)) violations.push(`${name}: dynamic/redirect server API`);
      for (const match of source.matchAll(/(?:from\s+|import\s*\()(['"])([^'"]+\.json)\1/g)) {
        const target = match[2].startsWith("@/") ? join(root, match[2].slice(2)) : join(dirname(file), match[2]);
        try {
          if (statSync(target).size > 200 * 1024) violations.push(`${name}: import JSON >200KB: ${match[2]}`);
        } catch {
          // Alias resolution for build-generated assets is handled by the build guard.
        }
      }
    }
  }
}
walk(join(root, "app"));
walk(join(root, "lib"));
if (violations.length) throw new Error(`Static architecture violations:\n${violations.join("\n")}`);
console.log("Static architecture guard passed.");
