import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { POLITICOS_SEED } from "./seed-politicos";
import { procesarGastosPolitico, assertGastosConsistency } from "./gastos-operacionales";
import { getDipParaPolitico } from "./politico-dip";
import politicosDipData from "@/data/politicos-dip.json";
import type { EtlRecord } from "./data-source";

describe("Coherencia global de datos y aserciones build-time", () => {
  describe("1. Formación y Profesión DIP + BCN (205 fichas)", () => {
    it("las 205 fichas de parlamentarios poseen bloque DIP mapeado y con enlace oficial válido", () => {
      expect(POLITICOS_SEED).toHaveLength(205);
      const dipEntries = Object.values(politicosDipData);
      expect(dipEntries).toHaveLength(205);

      for (const pol of POLITICOS_SEED) {
        const dip = getDipParaPolitico(pol.id, pol.nombre_completo);
        expect(dip).toBeDefined();
        expect(dip.politico_id).toBe(pol.id);
        expect(typeof dip.tiene_declaracion).toBe("boolean");
        expect(dip.profesion_oficio_display).toBeTruthy();
        expect(dip.formacion_titulos_display).toBeTruthy();
        expect(dip.declaracion_url).toMatch(/^https?:\/\//);

        // REGLA: solo lo que la fuente declara; campo vacío = "No declarado en DIP", NUNCA inferido
        if (!dip.tiene_declaracion) {
          expect(dip.profesion_oficio_display).toBe("No declarado en DIP");
          expect(dip.formacion_titulos_display).toBe("No declarado en DIP");
        }
      }
    });

    it("caso de prueba de control: Fabiola Campillai Rojas (sen-019) exhibe BCN 'Activista' + DIP 'Otra · sin títulos de educación superior'", () => {
      const campillai = POLITICOS_SEED.find((p) => p.id === "sen-019");
      expect(campillai).toBeDefined();
      expect(campillai?.nombre_completo).toBe("Fabiola Campillai Rojas");
      expect(campillai?.profesion).toBe("Activista");

      const dip = getDipParaPolitico("sen-019", campillai?.nombre_completo);
      expect(dip.tiene_declaracion).toBe(true);
      expect(dip.profesion_oficio_raw).toBe("OTRA");
      expect(dip.profesion_oficio_display).toBe("Otra");
      expect(dip.formacion_titulos_display).toBe("No registra títulos de educación superior");
      expect(dip.declaracion_url).toContain("infoprobidad");
    });
  });

  describe("2. Gastos Operacionales: Agregado === Suma de sus partes", () => {
    it("los registros del data lake y de los parlamentarios cumplen total_mes === suma(items) y previenen duplicación 2x", () => {
      // 1. Cargar registros reales de particiones de gastos del lago si existen
      const baseLake = join(process.cwd(), "data", "lake", "partitions");
      const rawRecords: EtlRecord[] = [];

      for (const source of ["gastos_camara", "gastos_senado"]) {
        const sourceDir = join(baseLake, source, "2026");
        if (!existsSync(sourceDir)) continue;
        for (const month of readdirSync(sourceDir)) {
          const gzPath = join(sourceDir, month, "records.jsonl.gz");
          if (!existsSync(gzPath)) continue;
          try {
            const content = gunzipSync(readFileSync(gzPath)).toString("utf8");
            for (const line of content.split("\n")) {
              if (!line.trim()) continue;
              const parsed = JSON.parse(line);
              if (parsed.data) rawRecords.push(parsed.data);
            }
          } catch {
            // ignore corrupt gz
          }
        }
      }

      // Si hay registros en el lake, los agrupamos por parlamentario / titular y comprobamos consistencia
      if (rawRecords.length > 0) {
        const porPolitico = new Map<string, EtlRecord[]>();
        for (const r of rawRecords) {
          const key = (r.diputado_id || r.nombre || "unknown") as string;
          if (!porPolitico.has(key)) porPolitico.set(key, []);
          porPolitico.get(key)!.push(r);
        }

        for (const [key, records] of porPolitico.entries()) {
          expect(() => assertGastosConsistency(key, records)).not.toThrow();

          const procesados = procesarGastosPolitico(records);
          for (const mes of procesados.meses) {
            const sumaItems = mes.items.reduce((a, b) => a + b.monto, 0);
            if (mes.items.length > 0) {
              expect(mes.total).toBe(sumaItems);
              expect(mes.sumaItems).toBe(sumaItems);
            }
          }

          const sumTotales = procesados.meses.reduce((a, b) => a + b.total, 0);
          expect(procesados.totalAcumulado).toBe(sumTotales);
        }
      }

      // 2. Comprobación exhaustiva para el caso vivo may-2026
      const mayRecords = [
        { id: "1", periodo: "2026-05", item: "VALOR TOTAL", monto_clp: 18330206 },
        { id: "2", periodo: "2026-05", item: "TRASLACION VEHICULO", monto_clp: 7847170 },
        { id: "3", periodo: "2026-05", item: "TELEFONIA CELULAR", monto_clp: 2845068 },
        { id: "4", periodo: "2026-05", item: "ARRIENDO OFICINAS", monto_clp: 7637968 },
      ] as unknown as EtlRecord[];

      const mayProcesado = procesarGastosPolitico(mayRecords);
      expect(mayProcesado.meses).toHaveLength(1);
      const may = mayProcesado.meses[0];
      expect(may.total).toBe(18330206);
      expect(may.sumaItems).toBe(18330206);
      expect(may.total).not.toBe(36660412); // Previene 2x
      expect(may.items).toHaveLength(3);
      expect(may.items.reduce((a, b) => a + b.monto, 0)).toBe(18330206);
    });
  });
});
