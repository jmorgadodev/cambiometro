import fs from 'fs';
import path from 'path';
import readline from 'readline';
import iconv from 'iconv-lite';
import { readFileIfPresent, readJsonIfPresent, writeFileAtomic } from './safe-file.mjs';

const TIPO_MAP = { "PPLAN": 1, "PCONT": 2, "PHONO": 3, "PCODIGO": 4 };

function parseFloatCl(str) {
    if (!str || typeof str !== 'string') return 0;
    const s = str.trim();
    if (!s) return 0;

    const lastDotIndex = s.lastIndexOf('.');
    const lastCommaIndex = s.lastIndexOf(',');
    
    let cleanStr = s;
    if (lastDotIndex > lastCommaIndex) {
        const parts = s.split('.');
        const lastPart = parts[parts.length - 1];
        if (lastPart.length === 3 && parts.length > 1 && !s.includes(',')) {
            cleanStr = s.replace(/\./g, '');
        } else {
            cleanStr = s.replace(/,/g, '');
        }
    } else if (lastCommaIndex > lastDotIndex) {
        cleanStr = s.replace(/\./g, '').replace(/,/g, '.');
    }

    const val = parseFloat(cleanStr);
    return isNaN(val) ? 0 : val;
}

function parseDateCl(str) {
    if (!str) return null;
    return str.trim().replace(/\//g, '-');
}

function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

async function processMunicipalCSV(filePath, muniId, tipoCode) {
    const fileStream = fs.createReadStream(filePath).pipe(iconv.decodeStream('win1252'));
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const records = [];
    const searchIndexItems = [];
    let linesProcessed = 0;

    for await (const line of rl) {
        linesProcessed++;
        if (linesProcessed === 1) continue; 

        const cols = line.split(';');
        if (cols.length < 40) continue;

        const year = parseInt(cols[6]?.trim(), 10);
        if (isNaN(year) || year < 2024) continue;

        const cargo = toTitleCase(cols[14]);
        const nombre_completo = toTitleCase(`${cols[9]} ${cols[10]} ${cols[11]}`.trim().replace(/\s+/g, ' '));
        const month = parseInt(cols[7]?.trim(), 10) || 0;

        const he_diurnas = parseFloatCl(cols[30]);
        const he_nocturnas = parseFloatCl(cols[33]);
        const he_festivas = parseFloatCl(cols[36]);
        const p_diurnas = parseFloatCl(cols[29]);
        const p_nocturnas = parseFloatCl(cols[32]);
        const p_festivas = parseFloatCl(cols[35]);

        const funcId = `func-${muniId}-muni-${tipoCode}-${linesProcessed}`;

        let tipoStr = "Desconocido";
        if (tipoCode === "PPLAN") tipoStr = "Planta";
        if (tipoCode === "PCONT") tipoStr = "Contrata";
        if (tipoCode === "PHONO") tipoStr = "Honorarios";
        if (tipoCode === "PCODIGO") tipoStr = "CodigoTrabajo";

        const funcionario = {
            id: funcId,
            nombre_completo,
            organo_nombre: cols[3]?.trim() || muniId,
            organo_tipo: "municipalidad",
            cargo,
            estamento: toTitleCase(cols[8]),
            tipo_contrato: tipoStr,
            remuneracion_bruta_mensual: parseFloatCl(cols[18]),
            remuneracion_liquida_mensual: parseFloatCl(cols[20]),
            fecha_ingreso: parseDateCl(cols[37]),
            fecha_termino: parseDateCl(cols[38]),
            horas_extras_diurnas_hrs: he_diurnas,
            horas_extras_nocturnas_hrs: he_nocturnas,
            horas_extras_festivas_hrs: he_festivas,
            horas_extras_mes_anterior: he_diurnas + he_nocturnas + he_festivas,
            monto_horas_extras_clp: p_diurnas + p_nocturnas + p_festivas,
            grado_eus: cols[12]?.trim(),
            formacion: toTitleCase(cols[13]),
            region: cols[15]?.trim(),
            asignaciones_especiales_clp: 0,
            rem_adicionales_clp: parseFloatCl(cols[22]),
            bonos_incentivos_clp: parseFloatCl(cols[24]),
            derecho_horas_extras: cols[27]?.trim().toLowerCase().includes("s"),
            viaticos_clp: parseFloatCl(cols[26]),
            observaciones: cols[40]?.trim(),
            fuente: `portaltransparencia.cl (CSV Municipal ${tipoCode})`,
            fuente_periodo: `${cols[7]?.trim()} ${cols[6]?.trim()}`,
            year,
            month
        };

        records.push(JSON.stringify(funcionario));

        searchIndexItems.push({
            id: funcId,
            n: nombre_completo,
            c: cargo,
            o: muniId,
            on: funcionario.organo_nombre,
            e: funcionario.estamento,
            t: TIPO_MAP[tipoCode] || 0,
            s: funcionario.remuneracion_bruta_mensual,
            h: funcionario.horas_extras_mes_anterior
        });
    }

    return { records, searchIndexItems };
}

async function run() {
    console.log("Iniciando Ingesta de Datos Municipales (desde CSV locales)");
    const inputDir = path.join(process.cwd(), 'data', 'raw', 'transparencia_activa');
    const projectionsDir = path.join(inputDir, 'projections', 'funcionarios-v1');
    
    fs.mkdirSync(projectionsDir, { recursive: true });

    let files;
    try {
        files = fs.readdirSync(inputDir).filter(f => f.endsWith('.csv') && f.startsWith('muni-'));
    } catch (error) {
        if (error?.code !== 'ENOENT') throw error;
        console.log(`El directorio ${inputDir} no existe. No hay CSVs municipales que procesar.`);
        return;
    }
    console.log(`Encontrados ${files.length} archivos CSV municipales.`);

    const orgData = new Map();
    let globalSearchIndex = [];

    // Cargar índice global existente si existe (para anexar)
    const indexPath = path.join(projectionsDir, 'search_index.json');
    try {
        globalSearchIndex = readJsonIfPresent(indexPath, []);
    } catch {}

    for (const file of files) {
        // Formato esperado: muni-maipu_PPLAN_1.csv
        const match = file.match(/^(muni-[a-z0-9-]+)_([A-Z]+)_\d+\.csv$/);
        if (!match) continue;

        const muniId = match[1];
        const tipoCode = match[2];
        const filePath = path.join(inputDir, file);

        console.log(`Procesando ${file}...`);
        const { records, searchIndexItems } = await processMunicipalCSV(filePath, muniId, tipoCode);

        if (!orgData.has(muniId)) orgData.set(muniId, []);
        orgData.get(muniId).push(...records);

        globalSearchIndex.push(...searchIndexItems);
    }

    // Escribir particiones de municipios
    for (const [muniId, jsonStrings] of orgData.entries()) {
        const orgPath = path.join(projectionsDir, `${muniId}.json`);
        let fileContent = '[\n' + jsonStrings.join(',\n') + '\n]';

        const existingContent = readFileIfPresent(orgPath, 'utf8');
        if (existingContent !== null) {
            const stripped = existingContent.replace(/\s*\]\s*$/, '');
            fileContent = stripped + ',\n' + jsonStrings.join(',\n') + '\n]';
        }
        
        writeFileAtomic(orgPath, fileContent, 'utf8');
        console.log(`    -> Creado/Actualizado: ${orgPath}`);
    }

    // Guardar el índice global actualizado
    writeFileAtomic(indexPath, JSON.stringify(globalSearchIndex), 'utf8');
    console.log(`    -> Índice global actualizado: ${globalSearchIndex.length} registros totales`);
}

run().catch(console.error);
