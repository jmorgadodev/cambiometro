import fs from 'fs';
import path from 'path';
import { fetchTransferMonth } from '../etl/connectors/ley-19862.mjs';

const outPath = path.join(process.cwd(), 'data', 'lake', 'projections', 'v1', 'ley19862.json');

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log("Iniciando Extractor Masivo de Ley 19.862 (Transferencias y Subvenciones)...");
    
    // Vamos a extraer los datos de 2023 y 2024
    const years = [2023, 2024];
    const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    
    let allRecords = [];

    // Cargar existentes si los hay
    if (fs.existsSync(outPath)) {
        try {
            allRecords = JSON.parse(fs.readFileSync(outPath, 'utf8'));
            console.log(`Cargados ${allRecords.length} registros existentes.`);
        } catch (e) {
            console.log("No se pudo leer el archivo existente, creando uno nuevo.");
        }
    }

    const existingIds = new Set(allRecords.map(r => r.id));
    let newCount = 0;

    for (const year of years) {
        for (const month of months) {
            // Evitar meses futuros en 2024 (asumiendo que estamos en 2024)
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            if (year === currentYear && month > currentMonth) continue;
            if (year > currentYear) continue;

            console.log(`[+] Descargando transferencias de ${year}-${month.toString().padStart(2, '0')}...`);
            try {
                const data = await fetchTransferMonth({ year, month });
                console.log(`    -> Obtenidos ${data.records.length} registros.`);
                
                for (const record of data.records) {
                    if (!existingIds.has(record.id)) {
                        allRecords.push(record);
                        existingIds.add(record.id);
                        newCount++;
                    }
                }
            } catch (error) {
                console.error(`    [x] Error descargando ${year}-${month}:`, error.message);
            }
            
            await delay(1000); // Throttling para no saturar registros19862.gob.cl
        }
    }

    // Filtrar solo los relevantes (Municipalidades, GOREs, etc) o guardar todo
    // En este caso, guardaremos todo el snapshot para mayor análisis
    console.log("==========================================");
    console.log(`[Crawler] Descarga finalizada.`);
    console.log(`[Crawler] Nuevos registros agregados: ${newCount}`);
    console.log(`[Crawler] Total registros en Base de Datos: ${allRecords.length}`);
    console.log("==========================================");

    const stream = fs.createWriteStream(outPath, 'utf8');
    stream.write('[\n');
    for (let i = 0; i < allRecords.length; i++) {
        stream.write(JSON.stringify(allRecords[i]));
        if (i < allRecords.length - 1) stream.write(',\n');
    }
    stream.write('\n]');
    stream.end();
}

run().catch(console.error);
