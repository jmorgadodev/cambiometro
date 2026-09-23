import { describe, expect, it, vi } from "vitest";
import { selectSenateExpensePeriods } from "./expense-window.mjs";
import { discoverSenatePublishedPeriods } from "./connectors/senado.mjs";

function period(year, month) {
  return { year, month };
}

describe("selectSenateExpensePeriods", () => {
  const published = [period(2025, 12), ...Array.from({ length: 7 }, (_, index) => period(2026, index + 1))];

  it("selects every published period for an explicit historical backfill across year boundaries", () => {
    expect(selectSenateExpensePeriods(published, {
      latest: period(2026, 7),
      fullHistory: true,
    })).toEqual(published);
  });

  it("keeps the incremental refresh limited to the latest month and its overlap", () => {
    expect(selectSenateExpensePeriods(published, {
      latest: period(2026, 7),
      overlapMonths: 1,
    })).toEqual([period(2026, 6), period(2026, 7)]);
  });

  it("rejects duplicate source periods instead of silently double-loading them", () => {
    expect(() => selectSenateExpensePeriods([...published, period(2026, 7)], {
      latest: period(2026, 7),
      fullHistory: true,
    })).toThrow("ETL_EXPENSE_DUPLICATE_PERIOD");
  });
});

describe("discoverSenatePublishedPeriods", () => {
  it("reads all API pages and returns valid published periods in chronological order", async () => {
    const fetchImpl = vi.fn(async (input) => {
      const url = new URL(input);
      const page = Number(url.searchParams.get("pagination[page]"));
      const items = page === 1
        ? [{ attributes: { ano: 2026, mes: 2 } }, { attributes: { ano: 2025, mes: 12 } }]
        : [{ attributes: { ano: 2026, mes: 1 } }];
      return new Response(JSON.stringify({
        data: {
          data: items,
          meta: { pagination: { pageCount: 2 } },
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    });

    await expect(discoverSenatePublishedPeriods({ fetchImpl })).resolves.toEqual([
      period(2025, 12), period(2026, 1), period(2026, 2),
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("fails closed when the published-period response has an invalid period", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: { data: [{ attributes: { ano: 2026, mes: 13 } }], meta: { pagination: { pageCount: 1 } } },
    }), { status: 200 }));

    await expect(discoverSenatePublishedPeriods({ fetchImpl })).rejects.toThrow("SENADO_INVALID_PUBLISHED_PERIOD");
  });

  it("rejects unexpected pagination sizes instead of making unbounded requests", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({
      data: { data: [], meta: { pagination: { pageCount: 999 } } },
    }), { status: 200 }));

    await expect(discoverSenatePublishedPeriods({ fetchImpl })).rejects.toThrow("SENADO_INVALID_PUBLISHED_PERIODS_RESPONSE");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
