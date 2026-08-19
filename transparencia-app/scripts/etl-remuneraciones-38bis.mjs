import fs from "node:fs";
import { externalText } from "./etl/safe-text.mjs";

const res = await fetch("https://comision38bis.gob.cl/registro-publico", {
  headers: { "user-agent": "transparencia-impulsacv (ETL sueldos 38 bis)" },
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const html = new TextDecoder("utf-8").decode(new Uint8Array(await res.arrayBuffer()));

const filas = [];
const re = /<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td[^>]*>\s*<span class="lead">\s*\$&nbsp;([\d.]+)\s*<\/span>\s*<\/td>\s*<\/tr>/g;
const limpia = externalText;

let m;
while ((m = re.exec(html)) !== null) {
  filas.push({
    partida: limpia(m[1]),
    organismo: limpia(m[2]),
    cargo: limpia(m[3]),
    nombre: limpia(m[4]),
    bruto_mensual: parseInt(m[5].replace(/\./g, ""), 10),
  });
}
console.log("filas parseadas:", filas.length);

const congreso = filas.filter((f) => f.partida === "Congreso Nacional");
console.log("congreso:", congreso.length);
const cargos = {};
for (const f of congreso) cargos[f.cargo] = (cargos[f.cargo] ?? 0) + 1;
console.log("cargos:", JSON.stringify(cargos, null, 1));

const gobierno = filas.filter((f) => f.partida !== "Congreso Nacional").length;
console.log("fuera de congreso:", gobierno);

const en = new Date().toISOString().slice(0, 7);
const out = {
  fuente: "Comisión para la Fijación de Remuneraciones (art. 38 bis) · registro público",
  url: "https://comision38bis.gob.cl/registro-publico",
  mes: "2026-05",
  extraido_en: en,
  filas: filas.length,
  congreso: congreso,
};
fs.writeFileSync("data/remuneraciones-38bis.json", JSON.stringify(out, null, 1), "utf8");
console.log("guardado data/remuneraciones-38bis.json");
