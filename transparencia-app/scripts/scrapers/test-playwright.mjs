import { chromium } from 'playwright';

async function run() {
    const browser = await chromium.launch({ headless: true });
    // User agent to bypass 403
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
    });
    const page = await context.newPage();

    try {
        console.log("Navegando a sub-departamento (Maipú - Contrata - Municipal)...");
        await page.goto('https://www.portaltransparencia.cl/PortalPdT/pdtta/-/ta/MU163/PR/PCONT/57815870?estadoItem=Publicado', { waitUntil: 'networkidle', timeout: 60000 });
        
        console.log("Página cargada. Esperando a que PrimeFaces renderice...");
        await page.waitForTimeout(5000); // Darle tiempo a PrimeFaces
        
        const pageText = await page.evaluate(() => document.body.innerText);
        console.log("--- TEXTO DE LA PÁGINA ---");
        console.log(pageText.substring(0, 1500)); 

    } catch (e) {
        console.error("Error:", e);
    } finally {
        await browser.close();
    }
}

run();
