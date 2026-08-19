import fs from "fs";
import path from "path";

const PROJECTION_DIR = path.join(process.cwd(), "data", "lake", "projections", "servel-gastos-v1");
const MONTO = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });

function main() {
    console.log("Auditoría de Gastos Electorales (SERVEL)");
    console.log(`Fuente canónica: ${PROJECTION_DIR}`);

    if (!fs.existsSync(PROJECTION_DIR)) {
        console.error(`ERROR: proyección no encontrada. Ejecute primero la ingesta (npm run ingest:servel).`);
        process.exit(1);
    }

    const files = fs.readdirSync(PROJECTION_DIR).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
        console.error("ERROR: la proyección está vacía (sin archivos .json).");
        process.exit(1);
    }

    let filas = 0;
    let filasMontoPositivo = 0;
    let totalGeneral = 0;
    let totalPartes = 0;
    const porPartido = new Map();
    const porCandidato = [];
    const erroresG6 = [];

    for (const file of files) {
        const candidato = JSON.parse(fs.readFileSync(path.join(PROJECTION_DIR, file), "utf8"));
        const gastos = Array.isArray(candidato.gastos) ? candidato.gastos : [];
        const sumaGastos = gastos.reduce((acc, g) => acc + (Number.isFinite(Number(g.monto)) ? Number(g.monto) : 0), 0);

        if (sumaGastos !== candidato.total_monto) {
            erroresG6.push(`${candidato.nombre} (${candidato.rut}): suma de gastos ${sumaGastos} !== total_monto ${candidato.total_monto}`);
        }

        for (const g of gastos) {
            filas++;
            const monto = Number(g.monto);
            if (Number.isFinite(monto) && monto > 0) filasMontoPositivo++;
            totalGeneral += Number.isFinite(monto) ? monto : 0;

            const key = g.partido || "(sin partido)";
            if (!porPartido.has(key)) porPartido.set(key, { filas: 0, monto: 0 });
            porPartido.get(key).filas++;
            porPartido.get(key).monto += Number.isFinite(monto) ? monto : 0;
        }

        totalPartes += candidato.total_monto;
        porCandidato.push({ nombre: candidato.nombre, rut: candidato.rut, filas: gastos.length, total: candidato.total_monto });
    }

    if (totalPartes !== totalGeneral) {
        erroresG6.push(`Global: suma de total_monto por candidato (${totalPartes}) !== suma de gastos (${totalGeneral})`);
    }

    console.log(`Candidatos: ${files.length} | Filas (gastos): ${filas} | Montos > 0: ${filasMontoPositivo} | Total general: ${MONTO.format(totalGeneral)}`);
    console.log("");
    console.log("Totales por partido:");
    for (const [partido, agg] of [...porPartido.entries()].sort((a, b) => b[1].monto - a[1].monto)) {
        console.log(`  ${partido.padEnd(40)} filas ${String(agg.filas).padStart(6)}  ${MONTO.format(agg.monto)}`);
    }
    console.log("");
    console.log("Totales por candidato (top 5 por monto):");
    for (const c of porCandidato.sort((a, b) => b.total - a.total).slice(0, 5)) {
        console.log(`  ${c.nombre.padEnd(40)} filas ${String(c.filas).padStart(5)}  ${MONTO.format(c.total)}`);
    }
    console.log("");

    if (erroresG6.length > 0) {
        console.error(`Sanity G6 (suma de partes): ERROR — ${erroresG6.length} discrepancia(s)`);
        for (const e of erroresG6) console.error(`  - ${e}`);
        process.exit(1);
    }

    console.log("Sanity G6 (suma de partes): OK");
}

main();