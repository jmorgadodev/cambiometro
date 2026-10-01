import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertPinnedReleaseSet, assertReleaseSetArtifacts } from "./release-set.mjs";
import { resolveSafeStaticPath } from "./static-site-inputs.mjs";

function requiredArgument(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`RELEASE_SET_ARGUMENT_REQUIRED:${name}`);
  return process.argv[index + 1];
}
const set = JSON.parse(readFileSync(requiredArgument("--pin"), "utf8"));
const manifest = JSON.parse(readFileSync(requiredArgument("--manifest"), "utf8"));
assertPinnedReleaseSet(set, manifest);
if (process.argv.includes("--input-root")) {
  const root = resolve(requiredArgument("--input-root"));
  assertReleaseSetArtifacts(set, manifest, (path) => readFileSync(resolveSafeStaticPath(root, path)));
}
console.log(JSON.stringify({ ok: true, scope: set.scope, releaseSetId: set.releaseSetId }));
