import fs from 'fs';
import readline from 'readline';
import path from 'path';
import iconv from 'iconv-lite';

const CSV_FILE_PATH = "C:\\Users\\jorge\\Downloads\\TA_PersonalPlanta.csv";

const MUNIS_PERMITIDAS = {
    "Municipalidad de Maipú": "muni-maipu",
    "Municipalidad de Providencia": "muni-providencia",
    "Municipalidad de Santiago": "muni-santiago",
    "Municipalidad de Puente Alto": "muni-puente-alto",
    "Municipalidad de La Florida": "muni-la-florida",
    "Municipalidad de Las Condes": "muni-las-condes",
    "Municipalidad de Vitacura": "muni-vitacura",
    "Municipalidad de Lo Barnechea": "muni-lo-barnechea",
    "Municipalidad de Antofagasta": "muni-antofagasta",
    "Municipalidad de Concepción": "muni-concepcion",
    "Municipalidad de Valparaíso": "muni-valparaiso",
    "Municipalidad de Viña del Mar": "muni-vina-del-mar"
};

const outputData = {};

function parseFloatCl(str) {
    if (!str || typeof str !== 'string') return 0;
    const cleanStr = str.trim().replace(/\./g, '').replace(/,/g, '.');
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

async function run() {
    console.log(`Abriendo stream de lectura: ${CSV_FILE_PATH}`);
    if (!fs.existsSync(CSV_FILE_PATH)) {
        console.error(`ERROR: El archivo no existe en ${CSV_FILE_PATH}`);
        return;
    }

    const fileStream = fs.createReadStream(CSV_FILE_PATH)
        .pipe(iconv.decodeStream('win1252'));

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let linesProcessed = 0;
    let officialsFound = 0;

    for await (const line of rl) {
        linesProcessed++;
        
        if (linesProcessed % 100000 === 0) {
            console.log(`Procesadas ${linesProcessed} líneas... Encontrados: ${officialsFound}`);
        }

        if (linesProcessed === 1) continue; 

        const cols = line.split(';');
        if (cols.length < 40) continue;

        const organismo_nombre = cols[3].trim();
        
        // Filtro estricto: ¿Es una Muni que nos importa?
        const muniId = MUNIS_PERMITIDAS[organismo_nombre] || MUNIS_PERMITIDAS[organismo_nombre.replace("ú", "")] || MUNIS_PERMITIDAS[organismo_nombre.replace("í", "")]; 
        if (!muniId) continue;
        
        // Filtro de año para reducir tamaño
        const year = parseInt(cols[6].trim(), 10);
        if (isNaN(year) || year < 2024) continue;

        officialsFound++;

        if (!outputData[muniId]) {
            outputData[muniId] = [];
        }

        const he_diurnas = parseFloatCl(cols[30]);
        const he_nocturnas = parseFloatCl(cols[33]);
        const he_festivas = parseFloatCl(cols[36]);
        const p_diurnas = parseFloatCl(cols[29]);
        const p_nocturnas = parseFloatCl(cols[32]);
        const p_festivas = parseFloatCl(cols[35]);

        const funcionario = {
            id: `func-${muniId}-planta-${officialsFound}`,
            nombre_completo: toTitleCase(`${cols[9]} ${cols[10]} ${cols[11]}`.trim().replace(/\s+/g, ' ')),
            organo_nombre: organismo_nombre,
            organo_tipo: "municipalidad",
            cargo: toTitleCase(cols[14]),
            estamento: toTitleCase(cols[8]),
            tipo_contrato: "Planta",
            remuneracion_bruta_mensual: parseFloatCl(cols[18]),
            remuneracion_liquida_mensual: parseFloatCl(cols[20]),
            fecha_ingreso: parseDateCl(cols[37]),
            fecha_termino: parseDateCl(cols[38]),
            horas_extras_diurnas_hrs: he_diurnas,
            horas_extras_nocturnas_hrs: he_nocturnas,
            horas_extras_festivas_hrs: he_festivas,
            horas_extras_mes_anterior: he_diurnas + he_nocturnas + he_festivas,
            monto_horas_extras_clp: p_diurnas + p_nocturnas + p_festivas,
            grado_eus: cols[12].trim(),
            formacion: toTitleCase(cols[13]),
            region: cols[15].trim(),
            asignaciones_especiales_clp: 0,
            rem_adicionales_clp: parseFloatCl(cols[22]),
            bonos_incentivos_clp: parseFloatCl(cols[24]),
            derecho_horas_extras: cols[27].trim().toLowerCase().includes("s"),
            viaticos_clp: parseFloatCl(cols[26]),
            observaciones: cols[40].trim(),
            fuente: cols[39].trim() || "portaltransparencia.cl (CSV Masivo)",
            fuente_periodo: `${cols[7].trim()} ${cols[6].trim()}`
        };

        outputData[muniId].push(funcionario);
    }

    console.log(`Procesamiento finalizado. Total líneas: ${linesProcessed}. Funcionarios extraídos (>=2024): ${officialsFound}.`);
    
    const outputDir = path.join(process.cwd(), 'data', 'raw', 'transparencia_activa');
    fs.mkdirSync(outputDir, { recursive: true });
    
    console.log(`Guardando archivos por municipio...`);
    for (const [k, v] of Object.entries(outputData)) {
        const outPath = path.join(outputDir, `${k}_planta.json`);
        try {
            fs.writeFileSync(outPath, JSON.stringify(v, null, 2));
            console.log(` - ${k}: ${v.length} funcionarios guardados en ${outPath}`);
        } catch(e) {
            console.error(`Error guardando ${k}:`, e.message);
        }
    }
    console.log(`[OK] Extracción masiva completada.`);
}

run().catch(console.error);
