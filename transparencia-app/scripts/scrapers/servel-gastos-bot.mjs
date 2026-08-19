import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = path.join(process.cwd(), 'data', 'raw', 'servel');
const outPath = path.join(outDir, 'reporte_gastos.xlsx');

// TODO: Reemplazar con la URL exacta del Visor de Gastos de SERVEL cuando esté disponible
const SERVEL_URL = 'https://aportes.servel.cl/';

async function run() {
    console.log("Iniciando Bot de SERVEL Gastos...");
    fs.mkdirSync(outDir, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    
    // Configuramos un User-Agent humano para evitar bloqueos
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
        acceptDownloads: true
    });

    const page = await context.newPage();

    try {
        console.log(`[+] Navegando a ${SERVEL_URL}...`);
        await page.goto(SERVEL_URL, { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log("[+] Buscando botón de exportación a Excel...");
        // Estrategia heurística: buscar botones que digan "Excel", "Descargar" o "Exportar"
        const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 30000 }),
            page.evaluate(() => {
                const buttons = Array.from(document.querySelectorAll('a, button'));
                const target = buttons.find(b => {
                    const txt = (b.innerText || b.title || '').toUpperCase();
                    return txt.includes('EXCEL') || txt.includes('DESCARGAR') || txt.includes('EXPORTAR');
                });
                if (target) {
                    target.click();
                } else {
                    throw new Error("No se encontró el botón de descarga en la interfaz");
                }
            })
        ]);

        console.log(`[+] Guardando archivo en ${outPath}...`);
        await download.saveAs(outPath);
        console.log("[OK] Descarga completada.");

    } catch (e) {
        console.error("Error durante la extracción con Playwright:", e.message);
        process.exit(1);
    } finally {
        await browser.close();
    }
}

run();
