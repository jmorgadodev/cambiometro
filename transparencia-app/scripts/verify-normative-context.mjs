/** Compact normative UI acceptance, local only; no normative data updates. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base = process.env.EXPLORER_QA_BASE ?? 'http://127.0.0.1:3200';
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const dir = 'artifacts/normative-presentation';
fs.mkdirSync(dir + '/screenshots', { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
const checks = [], errors = [], requests = [], accessibility = [], consoleErrors = [];
let status = 'failed';
page.on('pageerror', e => errors.push(e.message));
page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text());});
page.on('request', r => requests.push(new URL(r.url()).pathname));
const check = (name, passed) => { checks.push({ name, passed: !!passed }); assert.ok(passed, name); };
const panel = () => page.getByRole('dialog', { name: 'Alcance normativo', exact: true });
async function ready() { await page.locator('.site-header[data-hydrated="true"]').waitFor({ timeout: 60000 }); const b = page.getByRole('button', { name: 'Rechazar', exact: true }); if (await b.isVisible())
    await b.click(); }
async function openFirst() { const b = page.getByRole('button', { name: /^Información normativa/ }).first(); await b.click(); await panel().waitFor(); return b; }
async function selectConcept(value) { const picker = panel().getByRole('combobox', { name: 'Concepto normativo', exact: true }); if (await picker.count())
    await picker.selectOption(value); }
async function compact(name) { const text = await panel().innerText(); check(name + ' one concept at a time', await panel().locator('section').count() === 1); check(name + ' no bibliography or duplicated common prohibitions', !/Catálogo|[Vv]erificad|página PDF|crap-res|Regalos y donaciones|Actividades electorales o de campaña/.test(text)); }
try {
    await page.goto(base + '/dashboard/?desde=2026-04&hasta=2026-04&vista=panorama');
    await ready();
    const trigger = await openFirst();
    await selectConcept('comunicacion');
    check('brief concept and included content', await panel().getByRole('heading', { name: 'Comunicación', exact: true }).isVisible() && (await panel().innerText()).includes('Diseño, impresión'));
    await compact('dashboard');
    await panel().getByRole('button', { name: 'Qué no permite', exact: true }).click();
    check('specific communication exclusions retained', (await panel().innerText()).includes('Memorias USB'));
    await panel().getByRole('button', { name: 'Condiciones', exact: true }).click();
    await panel().getByText('Durante períodos electorales',{exact:true}).click();
    check('particular electoral limit and exceptions retained', (await panel().innerText()).includes('dos años calendario') && !(await panel().innerText()).includes('VI.D'));
    check('one discreet official reference', await panel().getByRole('link', { name: 'Ver normativa oficial ↗', exact: true }).getAttribute('href').then(u => u.includes('Resolucion-N%C2%B012') && u.includes('#page=')));
    check('general rules link preserves applicable version', await panel().getByRole('link', { name: 'Consultar reglas generales', exact: true }).getAttribute('href').then(u => u.includes('norma=crap-res-12') && u.endsWith('#reglas-generales')));
    const axe = await new AxeBuilder({ page }).include('dialog[open]').analyze();
    accessibility.push({ view: 'compact-panel', violations: axe.violations.map(v => ({ id: v.id, impact: v.impact })) });
    check('compact panel accessibility', !axe.violations.some(v => ['critical', 'serious'].includes(v.impact)));
    await page.screenshot({ path: dir + '/screenshots/dashboard-compacto.png' });
    await page.keyboard.press('Escape');
    check('Escape restores trigger focus', await trigger.evaluate(el => document.activeElement === el));
    await page.goto(base + '/dashboard/?desde=2026-03&hasta=2026-03&vista=panorama');
    await ready();
    await openFirst();
    await selectConcept('comunicacion');
    check('transition identifies the displayed segment', (await panel().innerText()).includes('11/03/2026') && (await panel().innerText()).includes('cruza un cambio'));
    check('transition never shows two versions simultaneously', await panel().locator('section').count() === 1 && !(await panel().innerText()).includes('Resolución N.º 11'));
    await page.screenshot({ path: dir + '/screenshots/transicion-compacta.png' });
    await page.keyboard.press('Escape');
    await page.goto(base + '/como-funciona/?norma=crap-res-11#normativa-y-fuentes');
    await ready();
    const doc = page.locator('#catalogo-normativo');
    await doc.getByRole('combobox', { name: 'Versión normativa', exact: true }).waitFor();
    await page.waitForFunction(() => document.querySelector('select[aria-label="Versión normativa"]')?.value === 'crap-res-11');
    check('documentary area supports historical deep links', await doc.getByRole('heading', { name: 'Normativa y fuentes', exact: true }).isVisible());
    check('common rules centralized', await page.locator('#reglas-generales').innerText().then(t => t.includes('Regalos y donaciones') && t.includes('página PDF')));
    await doc.locator('#norma-comunicacion > summary').click();
    check('historical provisions and citations retained', await doc.locator('#norma-comunicacion').innerText().then(t => t.includes('Resolución N.º 11') && t.includes('VI.D.7')));
    await doc.getByRole('combobox', { name: 'Versión normativa', exact: true }).selectOption('crap-res-12');
    check('documentary version remains shareable', new URL(page.url()).searchParams.get('norma') === 'crap-res-12');
    check('one documentary version selected', await doc.getByRole('combobox', { name: 'Versión normativa', exact: true }).inputValue() === 'crap-res-12');
    await doc.locator('#normativa-y-fuentes').scrollIntoViewIfNeeded();
    await page.screenshot({path:dir+'/screenshots/normativa-y-fuentes.png'});
    await doc.locator('#norma-comunicacion > summary').click();
    await doc.locator('#norma-comunicacion').scrollIntoViewIfNeeded();
    await page.screenshot({ path: dir + '/screenshots/normativa-detalle.png' });
    await page.goto(base + '/politico/paulina-vodanovic-rojas/#seccion-asesores');
    await ready();
    await page.getByRole('button', { name: 'Información normativa: Personal de apoyo', exact: true }).click();
    await compact('profile');
    check('empty specific exclusions do not create a redundant tab', await panel().getByRole('button', { name: 'Qué no permite', exact: true }).count() === 0);
    await panel().getByRole('button', { name: 'Condiciones', exact: true }).click();
    check('staff scope is explicit', (await panel().innerText()).includes('conjunto de contrataciones') && (await panel().innerText()).includes('no es un tope salarial individual') && (await panel().innerText()).includes('cargo publicado'));
    await page.setViewportSize({ width: 390, height: 844 });
    check('mobile panel fits without horizontal overflow', await panel().evaluate(el => el.getBoundingClientRect().width <= innerWidth && el.scrollWidth <= el.clientWidth + 1));
    await page.screenshot({ path: dir + '/screenshots/ficha-movil-compacta.png' });
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1366, height: 1000 });
    for (const [view, params] of [['comparar', '&participante=sen-030&participante=sen-025'], ['registros', '&componente=asesorias']]) {
        await page.goto(base + `/dashboard/?desde=2026-04&hasta=2026-04&vista=${view}${params}`);
        await ready();
        await openFirst();
        await compact(view);
        await page.keyboard.press('Escape');
    }
    check('no browser exceptions', !errors.length);
    check('no console or CSP errors',consoleErrors.length===0);
    check('no dynamic API or D1', !requests.some(u => /^\/api\/|\/d1\//.test(u)));
    status = 'passed';
}
finally {
    fs.writeFileSync(dir + '/browser-receipt.json', JSON.stringify({ status, base, checks, errors, consoleErrors, accessibility, apiRequests: requests.filter(u => u.startsWith('/api/')) }, null, 2));
    await browser.close();
}
console.log(JSON.stringify({ status, checks: checks.length }));
