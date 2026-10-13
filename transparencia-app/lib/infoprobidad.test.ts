import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

vi.mock("node:fs", () => ({ existsSync: () => true, readFileSync: vi.fn() }));

const record = (nombre: string, fecha: string, id: string) => ({
  id, nombre, fecha, title: `Declaración de ${nombre}`,
  organizations: [{ name: "Cámara" }],
  url: `https://datos.cplt.cl/datos/infoprobidad/${id}`,
});

async function lookup(nombre: string, records: ReturnType<typeof record>[]) {
  vi.mocked(readFileSync).mockReturnValue(JSON.stringify({ records }));
  const { infoprobidadParaPolitico } = await import("./infoprobidad");
  return infoprobidadParaPolitico(nombre);
}

beforeEach(() => vi.resetModules());

describe("atribución nominal conservadora de InfoProbidad", () => {
  it("no atribuye a Jorge la declaración más reciente de Felipe Alessandri", async () => {
    const result = await lookup("Jorge Alessandri Vergara", [
      record("FELIPE ALESSANDRI VERGARA", "2026-08-20", "felipe"),
      record("JORGE ALESSANDRI VERGARA", "2026-03-25", "jorge"),
    ]);
    expect(result.declaraciones.map(r => r.id)).toEqual(["jorge"]);
    expect(result.url_portal_oficial).toBe("https://datos.cplt.cl/datos/infoprobidad/jorge");
  });

  it("no atribuye nada si sólo hay coincidencia de apellidos", async () => {
    const result = await lookup("Jorge Alessandri Vergara", [
      record("FELIPE ALESSANDRI VERGARA", "2026-08-20", "felipe"),
    ]);
    expect(result.tiene_declaracion).toBe(false);
    expect(result.ultima_declaracion).toBeNull();
    expect(result.url_portal_oficial).toContain("Resultados?busqueda=Jorge");
  });

  it("conserva tildes, mayúsculas y espacios como variaciones del mismo nombre completo", async () => {
    const result = await lookup("José  Pérez Cerda", [
      record("  JOSÉ PÉREZ   CERDA ", "2026-03-25", "jose"),
    ]);
    expect(result.declaraciones.map(r => r.id)).toEqual(["jose"]);
  });

  it("no enlaza nombres parciales ni nombres vacíos", async () => {
    const records = [record("Alessandri Vergara", "2026-08-20", "parcial")];
    expect((await lookup("Jorge Alessandri Vergara", records)).tiene_declaracion).toBe(false);
    expect((await lookup("", records)).tiene_declaracion).toBe(false);
  });

  it("no confunde personas que comparten primer nombre y apellidos", async () => {
    const result = await lookup("Juan Carlos Pérez Cerda", [
      record("Juan Pedro Pérez Cerda", "2026-08-20", "otro-juan"),
    ]);
    expect(result.tiene_declaracion).toBe(false);
  });
});
