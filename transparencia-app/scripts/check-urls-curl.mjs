import { execSync } from "node:child_process";

const urls = [
  "https://cambiometro.impulsacv.cl/",
  "https://cambiometro.impulsacv.cl/politico/vanessa-kaiser-barents-von-hohenhagen",
  "https://cambiometro.impulsacv.cl/politico/diego-ibanez-cotroneo",
  "https://cambiometro.impulsacv.cl/politico/carlos-bianchi-chelech",
  "https://cambiometro.impulsacv.cl/politico/karim-bianchi-retamales",
  "https://cambiometro.impulsacv.cl/politico/gonzalo-winter-etcheberry",
];

console.log("==========================================================================");
console.log("  VERIFICACIÓN EN INCÓGNITA / COLD-START (HOME + 5 FICHAS) ");
console.log("==========================================================================");

for (const url of urls) {
  const t0 = performance.now();
  const httpCode = execSync(`curl.exe -s -o NUL -w "%{http_code}" "${url}"`, { encoding: "utf8" }).trim();
  const dur = Math.round(performance.now() - t0);
  console.log(`${url.padEnd(72)} -> Status: ${httpCode} | ${String(dur).padStart(4)}ms`);
}
console.log("==========================================================================");
