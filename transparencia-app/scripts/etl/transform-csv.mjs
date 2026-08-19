import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import crypto from 'crypto';
import { readJsonIfPresent, writeFileAtomic } from './safe-file.mjs';

const rawDir = path.join(process.cwd(), 'data', 'raw', 'transparencia_activa');
const outDir = path.join(process.cwd(), 'data', 'lake', 'projections', 'funcionarios-v1');

async function processCSV(filePath, muniId, category) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath, { encoding: 'utf8' }) // Transparencia activa CSVs might need latin1 or utf8
            .pipe(csv({ separator: ';' })) // Govt CSVs usually use semicolon
            .on('data', (data) => {
                // Mapear los campos del CSV del gobierno a nuestra estructura
                // Nota: Los encabezados del gobierno varían, esto es un mapeo defensivo típico.
                const nombre = data['Nombres'] || data['Nombres y Apellidos'] || data['Nombre completo'] || '';
                const paterno = data['Apellido paterno'] || '';
                const materno = data['Apellido materno'] || '';
                
                const nombreCompleto = nombre + (paterno ? ` ${paterno}` : '') + (materno ? ` ${materno}` : '');
                
                if (!nombreCompleto.trim()) return;

                // Limpieza de moneda
                const remBrutaStr = data['Remuneración bruta mensualizada'] || data['Remuneracion bruta mensual'] || '0';
                const remBruta = parseInt(remBrutaStr.replace(/[^\d]/g, ''), 10) || 0;

                results.push({
                    id: crypto.randomBytes(8).toString('hex'), // ID Temporal único
                    nombre_completo: nombreCompleto.trim(),
                    organo_nombre: muniId, // El crawler lo agrupa
                    organo_tipo: "municipalidad",
                    cargo: data['Cargo o función'] || data['Cargo'] || 'Sin Especificar',
                    estamento: data['Estamento'] || data['Escalafón'] || category,
                    tipo_contrato: category,
                    remuneracion_bruta_mensual: remBruta,
                    fecha_ingreso: data['Fecha de inicio'] || data['Fecha ingreso'] || '',
                    horas_extras_mes_anterior: 0,
                    remuneracion_liquida_mensual: Math.round(remBruta * 0.8), // Aprox si no viene
                    grado_eus: data['Grado EUS'] || data['Grado'] || '',
                    formacion: data['Calificación profesional o formación'] || data['Título'] || '',
                    region: data['Región'] || '',
                    observaciones: data['Observaciones'] || '',
                    fuente: 'Portal Transparencia Activa',
                    fuente_periodo: new Date().getFullYear().toString()
                });
            })
            .on('end', () => {
                resolve(results);
            })
            .on('error', (err) => {
                reject(err);
            });
    });
}

async function run() {
    console.log("Iniciando ETL de Transformación CSV -> JSON (Transparencia Activa)...");
    
    if (!fs.existsSync(rawDir)) {
        console.log("No hay directorio de datos raw. Abortando ETL.");
        return;
    }

    fs.mkdirSync(outDir, { recursive: true });

    const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.csv'));
    console.log(`Encontrados ${files.length} archivos CSV para procesar.`);

    // Agruparemos por municipio
    const dataByMuni = {};

    for (const file of files) {
        // formato esperado: muni-maipu_PCONT_1.csv
        const [muniId, category, indexStr] = file.replace('.csv', '').split('_');
        const filePath = path.join(rawDir, file);
        
        console.log(`Parseando ${file}...`);
        try {
            const records = await processCSV(filePath, muniId, category);
            if (!dataByMuni[muniId]) dataByMuni[muniId] = [];
            dataByMuni[muniId] = dataByMuni[muniId].concat(records);
        } catch (e) {
            console.error(`Error procesando ${file}:`, e.message);
        }
    }

    // Guardar los JSONs por municipio
    for (const [muniId, records] of Object.entries(dataByMuni)) {
        const outPath = path.join(outDir, `${muniId}.json`);
        
        // Si el archivo JSON ya existe (creado por cplt-crawler o histórica), lo cargamos y agregamos
        let existingRecords = [];
        try {
            existingRecords = readJsonIfPresent(outPath, []);
        } catch {}

        // Fusión básica (en producción se haría deduplicación por nombre_completo/RUT)
        const allRecords = [...existingRecords, ...records];

        writeFileAtomic(outPath, JSON.stringify(allRecords, null, 2), 'utf8');
        console.log(`[OK] Guardado ${allRecords.length} funcionarios en ${muniId}.json`);
    }

    console.log("Transformación ETL finalizada exitosamente.");
}

run().catch(console.error);
