import { describe, expect, it } from "vitest";
import { getR2LakeObjects } from "./restore-inventory.mjs";

describe("restore inventory", () => {
  it("fails closed when an inventory has no R2 lake objects", () => {
    expect(() => getR2LakeObjects({ d1: "d1/2026-09-06/transparencia-db.sql.gz", objects: [] }))
      .toThrow("R2_BACKUP_INVENTORY_EMPTY");
  });

  it("returns only lake object keys and preserves their order", () => {
    expect(getR2LakeObjects({
      objects: ["catalog/v1/manifest.json", "d1/2026-09-06/transparencia-db.sql.gz", "partitions/camara/2026/08/manifest.json"],
    })).toEqual(["catalog/v1/manifest.json", "partitions/camara/2026/08/manifest.json"]);
  });
});
