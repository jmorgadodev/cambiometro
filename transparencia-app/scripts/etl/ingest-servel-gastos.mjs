import fs from 'fs';
import path from 'path';
import { unzipSync } from 'fflate';

const inputPath = path.join(process.cwd(), 'data', 'raw', 'servel', 'reporte_gastos.xlsx');
const outputDir = path.join(process.cwd(), 'data', 'lake', 'projections', 'servel-gastos-v1');

function parseSharedStrings(xml) {
    const values = [];
    const re = /<si>([\s\S]*?)<\/si>/g;
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>|<t[^>]*\/>/g;
    let m;
    while ((m = re.exec(xml))) {
        let current = "";
        let t;
        tRe.lastIndex = 0;
        while ((t = tRe.exec(m[1]))) if (t[1] !== undefined) current += t[1];
        values.push(current);
    }
    return values;
}

function rowsOf(files, shared, sheetKey) {
    const text = new TextDecoder().decode(files[sheetKey]);
    const rows = new Map();
    const cellRe = /<c r="([A-Z]+)(\d+)"(?:[^>]*t="([^"]+)")?[^>]*>([\s\S]*?)<\/c>/g;
    let m;
    while ((m = cellRe.exec(text))) {
        const val = m[4];
        const vm = val.match(/<v>([\s\S]*?)<\/v>/);
        let value = vm ? vm[1] : "";
        if (m[3] === "s") value = shared[Number(value)] ?? `#${value}`;
        const row = Number(m[2]);
        if (!rows.has(row)) rows.set(row, new Map());
        rows.get(row).set(m[1], value);
    }
    return rows;
}

async function run() {
    console.log("Iniciando Ingesta de Gastos Electorales (SERVEL)");
    if (!fs.existsSync(inputPath)) {
        console.error(`ERROR: Archivo no encontrado en ${inputPath}. Ejecute el bot primero.`);
        process.exit(1);
    }

    fs.mkdirSync(outputDir, { recursive: true });

    const bytes = fs.readFileSync(inputPath);
    const files = unzipSync(bytes);
    
    if (!files["xl/sharedStrings.xml"]) {
        console.error("ERROR: sharedStrings.xml no encontrado en el Excel.");
        process.exit(1);
    }

    const shared = parseSharedStrings(new TextDecoder().decode(files["xl/sharedStrings.xml"]));
    const rows = rowsOf(files, shared, "xl/worksheets/sheet1.xml");

    // header en fila 11: 
    // B:TIPO C:ELECCIÓN D:REGIÓN E:TERRITORIO F:CANDIDATURA G:PARTIDO H:PACTO I:SUBPACTO 
    // J:RUT K:DV L:NOMBRE M:FECHA N:TIPODOC O:DESC P:TIPOCUENTA Q:DESC_Q R:NUMDOC S:GLOSA T:MONTO U:ESTADO

    const gastosPorRut = new Map();
    let procesados = 0;

    for (const [r, cs] of rows) {
        if (r <= 11) continue;
        const A = cs.get("A");
        if (A === undefined) continue;

        const rutRaw = cs.get("J");
        if (!rutRaw) continue;

        const rut = String(rutRaw).trim().replace(/\./g, '');
        if (rut === "") continue;

        const gasto = {
            tipo: cs.get("B") ?? "",
            eleccion: cs.get("C") ?? "",
            candidatura: cs.get("F") ?? "",
            partido: cs.get("G") ?? "",
            fecha: cs.get("M") ?? "",
            tipo_doc: cs.get("N") ?? "",
            glosa: cs.get("S") ?? "",
            monto: Number(String(cs.get("T") ?? "0")),
            estado: cs.get("U") ?? ""
        };

        if (!gastosPorRut.has(rut)) {
            gastosPorRut.set(rut, {
                rut,
                nombre: cs.get("L") ?? "",
                gastos: [],
                total_monto: 0
            });
        }

        const personData = gastosPorRut.get(rut);
        personData.gastos.push(gasto);
        if (Number.isFinite(gasto.monto)) {
            personData.total_monto += gasto.monto;
        }

        procesados++;
    }

    console.log(`Procesados ${procesados} gastos electorales.`);
    console.log(`Generando particiones para ${gastosPorRut.size} candidatos...`);

    for (const [rut, data] of gastosPorRut.entries()) {
        const outPath = path.join(outputDir, `${rut}.json`);
        fs.writeFileSync(outPath, JSON.stringify(data));
    }

    console.log("[OK] Ingesta de Gastos SERVEL completada.");
}

run().catch(console.error);
