import fs from 'fs';

const seedText = fs.readFileSync('lib/seed-politicos.ts', 'utf8');
const pLines = seedText.split('\n');
let currentPol = null;
const pols = [];
for (const line of pLines) {
  if (line.includes('id: "')) {
    const id = line.match(/id:\s*"([^"]+)"/)?.[1];
    currentPol = { id };
    pols.push(currentPol);
  }
  if (currentPol && line.includes('nombre_completo: "')) {
    currentPol.nombre_completo = line.match(/nombre_completo:\s*"([^"]+)"/)?.[1];
  }
  if (currentPol && line.includes('cargo: "')) {
    currentPol.cargo = line.match(/cargo:\s*"([^"]+)"/)?.[1];
  }
}

const sen19 = pols.find(p => p.id === 'sen-019');
console.log('sen-019:', sen19);

const pa = JSON.parse(fs.readFileSync('data/personal-apoyo.json', 'utf8'));
const senadores = pa.senadores || {};
console.log('\nMatching sen-019 against personal-apoyo.json:');
for (const ofi of Object.keys(senadores)) {
  const normOfi = ofi.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normName = (sen19?.nombre_completo || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const tokens = normName.split(' ');
  const matchCount = tokens.filter(t => normOfi.includes(t)).length;
  if (matchCount >= 2) {
    console.log('Matched oficina:', ofi, '->', senadores[ofi].length, 'registros');
    console.log('Sample staff:', senadores[ofi].slice(0, 3));
  }
}
