import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import type { ExplorerBootstrap } from "./parliamentary-explorer";
export function loadExplorerBootstrap(): ExplorerBootstrap | null {
  try {
    const root = path.resolve("public/data/parliamentary-explorer"),
      file = path.join(root, "manifest.json");
    if (!fs.existsSync(file)) {
      if (process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY === "1")
        throw new Error("EXPLORER_BOOTSTRAP_REQUIRED");
      return null;
    }
    const manifest = JSON.parse(fs.readFileSync(file, "utf8"));
    const bytes = fs.readFileSync(path.join(root, "bootstrap.json"));
    if (
      bytes.length !== manifest.bootstrap.bytes ||
      createHash("sha256").update(bytes).digest("hex") !==
        manifest.bootstrap.sha256
    )
      throw new Error("EXPLORER_BOOTSTRAP_INTEGRITY_FAILED");
    const data = JSON.parse(bytes.toString()) as ExplorerBootstrap;
    if (
      data.schemaVersion !== 1 ||
      data.releaseId !== manifest.releaseId ||
      data.projectionId !== manifest.projectionId
    )
      throw new Error("EXPLORER_BOOTSTRAP_RELEASE_MISMATCH");
    if (process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY === "1") {
      if (
        process.env.CAMBIOMETRO_DASHBOARD_SOURCE_RECEIPT ||
        process.env.CAMBIOMETRO_DASHBOARD_LOCAL_DATA
      )
        throw new Error("EXPLORER_LOCAL_DATA_IN_PUBLICATION");
      const pin = JSON.parse(
        fs.readFileSync(".ci-data-version/release-set.json", "utf8"),
      );
      if (pin.releaseSetId !== data.releaseId)
        throw new Error("EXPLORER_PUBLISHED_RELEASE_MISMATCH");
    }
    return data;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    // Development can report unavailable filesystem; publication and integrity errors fail closed.
    if (
      process.env.CAMBIOMETRO_PUBLISHED_RELEASE_ONLY !== "1" &&
      (code === "ENOENT" || code === "ENOSYS")
    )
      return null;
    throw error;
  }
}
