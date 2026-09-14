import { describe, expect, it } from "vitest";
import { planR2Publication } from "./r2.mjs";

const asset = (key, size, checksumSha256 = `${key}-checksum`) => ({ key, size, checksumSha256 });

describe("guardia de almacenamiento R2", () => {
  it("calcula crecimiento, margen y conserva la versión anterior para rollback", () => {
    const plan = planR2Publication([
      asset("projections/demo/versions/2026-09/manifest.json", 300),
      asset("projections/demo/versions/2026-09/page-0001.json", 200),
    ], {
      objects: [
        asset("projections/demo/versions/2026-08/manifest.json", 100),
        asset("projections/demo/versions/2026-08/page-0001.json", 100),
      ],
    }, 2_000);

    expect(plan.previousBytes).toBe(200);
    expect(plan.projectedBytes).toBe(700);
    expect(plan.growthBytes).toBe(500);
    expect(plan.headroomBytes).toBe(1_300);
    expect(plan.inventory).toMatchObject({ previousBytes: 200, projectedBytes: 700, headroomBytes: 1_300 });
    expect(plan.inventory.objects.map((item) => item.key)).toEqual(expect.arrayContaining([
      "projections/demo/versions/2026-08/manifest.json",
      "projections/demo/versions/2026-09/manifest.json",
    ]));
  });

  it("bloquea crecimiento nuevo al superar el 95% del límite", () => {
    expect(() => planR2Publication([
      asset("projections/demo/versions/2026-09/manifest.json", 960),
    ], { objects: [] }, 1_000)).toThrow("R2_GROWTH_BLOCKED_AT_95_PERCENT");
  });
});
