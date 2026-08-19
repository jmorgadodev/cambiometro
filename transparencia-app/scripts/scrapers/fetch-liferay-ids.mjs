import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outPath = path.join(process.cwd(), 'data', 'lake', 'liferay-ids.json');

async function run() {
    console.log("Iniciando Playwright para extraer IDs del Portal de Transparencia...");
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://www.portaltransparencia.cl/PortalPdT/web/guest/directorio-de-organismos-regulados', { timeout: 60000 });
        
        console.log("Página cargada. Esperando a que el DOM se estabilice...");
        await page.waitForTimeout(5000);

        const links = await page.evaluate(() => {
            const anchors = Array.from(document.querySelectorAll('a'));
            return anchors
                .map(a => ({ name: a.innerText.trim(), href: a.href }))
                .filter(a => a.href.includes('org='));
        });

        console.log(`Se encontraron ${links.length} enlaces con org=`);
        console.log(links.slice(0, 10));

        fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(links, null, 2));
    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}

run();
