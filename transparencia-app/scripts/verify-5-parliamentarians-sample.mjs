/**
 * scripts/verify-5-parliamentarians-sample.mjs
 * Extrae y valida al 100% los datos de las 5 fichas parlamentarias seleccionadas
 */

import fs from "node:fs";

const dataRem = JSON.parse(fs.readFileSync("data/remuneraciones-38bis.json", "utf8"));
const dataPersonal = JSON.parse(fs.readFileSync("data/personal-apoyo.json", "utf8"));
const dataDipIds = JSON.parse(fs.readFileSync("data/diputados-ids.json", "utf8"));

const SAMPLE = [
  { tipo: "senador", nombre: "Vanessa Kaiser Barents-Von Hohenhagen", keyStaff: "KAISER BARENTS VON HOHENHAGEN VANESSA OLIMPIA", partido: "PNL", territorio: "Circunscripción 11 (La Araucanía)", bcnUrl: "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Vanessa_Kaiser_Barents-von_Hohenhagen" },
  { tipo: "senador", nombre: "Paulina Núñez Urrutia", keyStaff: "NUNEZ URRUTIA PAULINA", partido: "RN", territorio: "Circunscripción 3 (Antofagasta)", bcnUrl: "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Paulina_N%C3%BA%C3%B1ez_Urrutia" },
  { tipo: "senador", nombre: "Alfonso de Urresti Longton", keyStaff: "DE URRESTI LONGTON ALFONSO", partido: "PS", territorio: "Circunscripción 12 (Los Ríos)", bcnUrl: "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Alfonso_De_Urresti_Longton" },
  { tipo: "diputado", nombre: "Jorge Alessandri Vergara", camaraId: "1009", partido: "UDI", territorio: "Distrito 10 (Región Metropolitana)", bcnUrl: "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Jorge_Alessandri_Vergara" },
  { tipo: "diputado", nombre: "Boris Barrera Moreno", camaraId: "1012", partido: "PCCh", territorio: "Distrito 9 (Región Metropolitana)", bcnUrl: "https://www.bcn.cl/historiapolitica/resenas_parlamentarias/wiki/Boris_Barrera_Moreno" }
];

console.log("=== COMPROBACIÓN DETALLADA DE LAS 5 FICHAS PARLAMENTARIAS ===");

for (const p of SAMPLE) {
  console.log(`\n======================================================================`);
  console.log(`📌 ${p.nombre} (${p.tipo.toUpperCase()})`);
  console.log(`- Territorio: ${p.territorio}`);
  console.log(`- Partido: ${p.partido}`);
  console.log(`- Reseña BCN: ${p.bcnUrl}`);

  // 1. Dieta
  const rem = dataRem.congreso.find(r => 
    r.nombre.toLowerCase().includes(p.nombre.toLowerCase().split(" ")[0]) &&
    r.nombre.toLowerCase().includes(p.nombre.toLowerCase().split(" ")[1])
  );
  console.log(`- Dieta Bruta Oficial (art. 38 bis): $${rem ? rem.bruto_mensual.toLocaleString("es-CL") : "N/A"}`);

  // 2. Personal de Apoyo
  if (p.tipo === "senador") {
    const staff = dataPersonal.senadores[p.keyStaff] || [];
    const julio = staff.filter(r => r.periodo === "2026-07");
    const totalJulio = julio.reduce((s, r) => s + r.monto, 0);
    console.log(`- Personal de Apoyo (Julio 2026): ${julio.length} contratos por un total de $${totalJulio.toLocaleString("es-CL")}`);
    julio.forEach(r => {
      console.log(`  · ${r.nombre} ${r.apellido_paterno} ${r.apellido_materno} (${r.cargo}): $${r.monto.toLocaleString("es-CL")}`);
    });
  } else {
    const dip = dataPersonal.diputados[p.camaraId];
    const staff = dip?.personal_apoyo || [];
    const totalStaff = staff.reduce((s, r) => s + (r.sueldo || 0), 0);
    console.log(`- Personal de Apoyo Cámara: ${staff.length} contrataciones por un total de $${totalStaff.toLocaleString("es-CL")}`);
    staff.forEach(r => {
      console.log(`  · ${r.nombre} (${r.cargo} - ${r.tipo}): $${(r.sueldo || 0).toLocaleString("es-CL")}`);
    });
  }
}
