import { describe, expect, it } from "vitest";
import { legalEntityIdFromRut } from "@/lib/legal-rut";

describe("identidad jurídica por RUT", () => {
  it("normaliza sólo RUT válidos", () => {
    expect(legalEntityIdFromRut("76.044.753-6")).toBe("legal-cl-760447536");
    expect(legalEntityIdFromRut("60.910.000-1")).toBe("legal-cl-609100001");
    expect(legalEntityIdFromRut("76.044.753-5")).toBeNull();
    expect(legalEntityIdFromRut("empresa")).toBeNull();
  });
});
