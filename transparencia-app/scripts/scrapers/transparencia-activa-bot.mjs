import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const outputRawDir = path.join(process.cwd(), 'data', 'raw', 'transparencia_activa');

// Para el piloto, usaremos Maipú y Providencia como prueba.
// En producción, esto se iterará con un diccionario completo.
const MUNIS = [
    { id: 'muni-maipu', liferay_id: 'MU163' },
    { id: 'muni-providencia', liferay_id: 'MU226' }
];

const CATEGORIES = [
    { code: 'PPLAN', name: 'Planta' },
    { code: 'PCONT', name: 'Contrata' },
    { code: 'PHONO', name: 'Honorarios' },
    { code: 'PCODIGO', name: 'Codigo_Trabajo' }
];

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
    console.log("Iniciando Bot de Transparencia Activa...");
    fs.mkdirSync(outputRawDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    
    // Configuramos un User-Agent humano para evitar bloqueos básicos de Cloudflare
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        acceptDownloads: true
    });

    const page = await context.newPage();

    for (const muni of MUNIS) {
        for (const cat of CATEGORIES) {
            const baseUrl = `https://www.portaltransparencia.cl/PortalPdT/pdtta/-/ta/${muni.liferay_id}/PR/${cat.code}`;
            console.log(`[+] Procesando ${muni.id} - ${cat.name} (${baseUrl})...`);
            
            try {
                // Navegamos a la URL base de la categoría
                await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 60000 });
                await delay(3000);

                // Primefaces carga los sub-departamentos (Municipal, Salud, Educación) como enlaces.
                // Extraemos todos los sub-departamentos que tengan "estadoItem=Publicado"
                const subLinks = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a'));
                    return links
                        .filter(a => a.href && a.href.includes('estadoItem=Publicado'))
                        .map(a => a.href);
                });

                if (subLinks.length === 0) {
                    console.log(`[-] No se encontraron sub-departamentos para ${cat.name}. (Posible mantención o sin datos).`);
                    continue;
                }

                console.log(`[+] Encontrados ${subLinks.length} sub-departamentos.`);

                // Por cada sub-departamento, entramos y descargamos el CSV
                let index = 1;
                for (const subLink of subLinks) {
                    console.log(`    -> Visitando sub-departamento ${index}...`);
                    await page.goto(subLink, { waitUntil: 'networkidle', timeout: 60000 });
                    await delay(4000); // Esperar que PrimeFaces renderice la tabla

                    // Buscamos el botón de exportación a CSV. PrimeFaces suele tener un <a> o <button> con clase ui-icon-csv o texto CSV/Exportar.
                    // Aquí usamos una estrategia genérica de hacer clic en cualquier elemento que contenga "CSV".
                    try {
                        const [download] = await Promise.all([
                            page.waitForEvent('download', { timeout: 15000 }),
                            // Intentamos cliquear un elemento que contenga 'CSV'
                            page.evaluate(() => {
                                const els = Array.from(document.querySelectorAll('a, button, img'));
                                const target = els.find(el => {
                                    const text = el.innerText || el.getAttribute('title') || el.getAttribute('alt') || '';
                                    return text.toUpperCase().includes('CSV');
                                });
                                if (target) target.click();
                            })
                        ]);

                        const filePath = path.join(outputRawDir, `${muni.id}_${cat.code}_${index}.csv`);
                        await download.saveAs(filePath);
                        console.log(`    [OK] Descargado: ${filePath}`);
                    } catch (err) {
                        console.log(`    [x] No se pudo descargar CSV en sub-departamento ${index} (quizás no hay botón o portal en mantención)`);
                    }
                    
                    index++;
                    await delay(2000); // Throttling para no saturar al Estado
                }

            } catch (error) {
                console.error(`[Error] Falló el procesamiento de ${muni.id} - ${cat.name}:`, error.message);
            }
        }
    }

    await browser.close();
    console.log("Bot finalizado. Ejecutando ETL de transformación...");
    
    // Llamar al transformador
    try {
        execSync('node scripts/etl/transform-csv.mjs', { stdio: 'inherit' });
    } catch(e) {
        console.error("Error ejecutando transform-csv.mjs");
    }
}

run().catch(console.error);
