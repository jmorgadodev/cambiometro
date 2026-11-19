import {describe,expect,it} from "vitest";
import {isPublicMovementSignal} from "./movimientos";
import {buildEditorialMovements} from "./home-editorial-adapter";
import {buildMovementPayload,parseMovementSignals} from "../scripts/movimientos-pipeline.mjs";
import {readFileSync} from "node:fs";

const commentary=[
  "“Presentar una renuncia fundada es lealtad”: Jaime Mañalich aconseja al ministro Fernando Rabat evaluar su salida ante la crisis del Gobierno",
  "PDG cuestiona designación de exministra Steinert en Paraguay: “El Gobierno debe terminar con los premios de consuelo”",
  "Elizalde cuestiona a ministro de Justicia y apunta a Presidente Kast: “Si yo fuera Rabat, habría presentado mi renuncia”",
];
describe("conteo de salidas frente a comentarios políticos",()=>{
  it.each(commentary)("no cuenta ni publica esta opinión: %s",title=>{
    const signal={title,summary:title,signal_id:"comment",source_id:"test",source_label:"Fuente",source_tier:"press" as const,url:"https://example.test/news",date:"2026-11-11",status:"en_confirmacion" as const,tipo:"renuncia" as const,detected_at:"2026-11-12T10:00:00Z",fase:"anunciado" as const};
    expect(isPublicMovementSignal(signal)).toBe(false);
    expect(buildEditorialMovements([], [signal])).toEqual([]);
    expect(parseMovementSignals(JSON.stringify([signal]),{id:"test",url:"https://example.test",contentType:"application/json"})).toHaveLength(0);
    const previous=JSON.parse(readFileSync("data/movimientos.json","utf8"));
    const replay=buildMovementPayload({...previous,signals:[signal]},{now:"2026-11-12T12:00:00Z"});
    expect(replay.signals).toHaveLength(0);
    expect(replay.signal_observations).toContainEqual(expect.objectContaining({signal_id:"comment"}));
  });
  it.each(["Ministro de Justicia presenta su renuncia al cargo", "Minsal solicita la renuncia del seremi de Salud de La Araucanía", "Gobierno remueve al subsecretario de Justicia"])("conserva el anuncio concreto: %s",title=>{
    expect(isPublicMovementSignal({title})).toBe(true);
    expect(parseMovementSignals(JSON.stringify([{title,date:"2026-10-30",url:"https://example.test/actual"}]),{id:"test",url:"https://example.test",contentType:"application/json"})).toHaveLength(1);
  });
});
