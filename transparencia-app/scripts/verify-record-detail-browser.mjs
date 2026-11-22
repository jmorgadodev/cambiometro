/** Real browser acceptance for complete contextual records, local only. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import csv from 'csv-parser';
import { build } from 'esbuild';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
const base = process.env.EXPLORER_QA_BASE ?? 'http://127.0.0.1:3200';
assert.match(base, /^http:\/\/(127\.0\.0\.1|localhost):\d+$/);
const dir = 'artifacts/record-detail';
fs.mkdirSync(dir + '/screenshots', { recursive: true });
await build({ entryPoints: ['lib/parliamentary-explorer.ts'], outfile: dir + '/qa-model.cjs', bundle: true, platform: 'node', format: 'cjs', packages: 'external' });
const model = createRequire(import.meta.url)(process.cwd() + '/' + dir + '/qa-model.cjs');
const data = model.unpackExplorer(JSON.parse(fs.readFileSync('public/data/parliamentary-explorer/bootstrap.json', 'utf8')));
const all = data.partitions.flatMap(p => JSON.parse(fs.readFileSync('public' + p.path, 'utf8')).rows);
const checks = [], errors = [], requests = [], accessibility = [];
const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1366, height: 1000 }, reducedMotion: 'reduce' });
const page = await context.newPage();
page.on('pageerror', e => errors.push(e.message));
page.on('request', r => requests.push(new URL(r.url()).pathname));
let status = 'failed';
const check = (name, value) => { checks.push({ name, passed: !!value }); assert.ok(value, name); };
const panel = () => page.getByRole('dialog', { name: 'Detalle contextual', exact: true });
const region = () => panel().getByRole('region', { name: 'Registros del total', exact: true });
const defaults = { ...model.explorerDefaults(data), from: '2026-04', to: '2026-04', view: 'panorama' };
async function open(component, patch = {}) {
    const q = { ...defaults, ...patch };
    await page.goto(base + '/dashboard/?' + model.explorerParams(q));
    await page.locator('.site-header[data-hydrated="true"]').waitFor({ timeout: 60000 });
    const consent = page.getByRole('button', { name: 'Rechazar', exact: true });
    if (await consent.isVisible())
        await consent.click();
    await page.getByRole('button', { name: new RegExp('^' + (component === 'gastos' ? 'Gastos operacionales' : 'Asesorías externas') + ' \\$') }).click();
    await region().locator('[data-record-id]').first().waitFor({ timeout: 60000 });
    check(component + ' complete detail reconciles', await region().getAttribute('data-reconciliation') === 'matched');
    return { q: { ...q, component, componentIds: [component] }, rows: model.filterExplorerRecords(data, { ...q, component, componentIds: [component] }, all) };
}
async function download() {
    const pending = page.waitForEvent('download');
    await region().getByRole('button', { name: /^Exportar detalle CSV/ }).click();
    const d = await pending;
    const stream = await d.createReadStream();
    const chunks = [];
    for await (const c of stream)
        chunks.push(c);
    const text = Buffer.concat(chunks).toString('utf8').replace(/^\uFEFF/, '');
    const rows = [];
    for await (const row of Readable.from([Buffer.from(text)]).pipe(csv({ separator: ';' })))
        rows.push(row);
    return rows;
}
try {
    const gasto = await open('gastos');
    const ids = region().locator('[data-record-id]');
    check('first page bounded and amount descending', await ids.count() === 10 && await ids.evaluateAll(nodes => nodes.every((n, i) => !i || Number(nodes[i - 1].dataset.recordAmount) >= Number(n.dataset.recordAmount))));
    const pages = Math.ceil(gasto.rows.length / 10);
    await region().getByRole('spinbutton', { name: 'Ir a página del detalle' }).fill(String(pages));
    await page.waitForFunction(n => document.querySelectorAll('[aria-label="Registros del total"] [data-record-id]').length === n, gasto.rows.length % 10 || 10);
    const sortedGastos = [...gasto.rows].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0) || a.id.localeCompare(b.id));
    check('last page exposes records beyond previous eight-row limit', await ids.first().getAttribute('data-record-id') === sortedGastos[(pages - 1) * 10].id);
    await region().getByRole('spinbutton', { name: 'Ir a página del detalle' }).fill('1');
    let csvRows = await download();
    check('expenses CSV contains the entire selection', csvRows.length === gasto.rows.length && csvRows.reduce((s, r) => s + Number(r['Monto CLP']), 0) === gasto.rows.reduce((s, r) => s + (r.amount ?? 0), 0));
    await region().getByText('Filtrar registros del detalle', { exact: true }).click();
    await region().getByLabel('Institución', { exact: true }).selectOption('senado');
    csvRows = await download();
    check('institution filter does not leak deputies', csvRows.length > 0 && csvRows.every(r => r.Institución === 'Senado'));
    const sample = gasto.rows.find(r => data.members.find(m => m.id === r.memberId)?.chamber === 'senado');
    await region().getByLabel('Agrupación visual (opcional)', { exact: true }).selectOption(sample.category);
    await region().getByLabel('Ítem original', { exact: true }).selectOption(sample.item);
    await region().getByLabel('Parlamentario informante', { exact: true }).selectOption(sample.memberId);
    csvRows = await download();
    check('category item and reporter filters reconcile', csvRows.length === gasto.rows.filter(r => r.memberId === sample.memberId && r.category === sample.category && r.item === sample.item).length && csvRows.every(r => r['Ítem original'] === sample.item));
    await region().getByRole('button', { name: 'Restablecer detalle', exact: true }).click();
    await region().getByText('Filtrar registros del detalle', { exact: true }).click();
    await ids.first().locator('summary').first().click();
    check('expense identification and original item visible', (await region().innerText()).includes('Parlamentario informante'));
    await ids.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: dir + '/screenshots/gastos-registros.png' });
    const axe = await new AxeBuilder({ page }).include('dialog[open]').analyze();
    accessibility.push({ view: 'gastos', violations: axe.violations.map(v => ({ id: v.id, impact: v.impact })) });
    check('expense panel accessible', !axe.violations.some(v => ['critical', 'serious'].includes(v.impact)));
    await page.keyboard.press('Escape');
    const asesorias = await open('asesorias');
    const top = [...asesorias.rows].sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0))[0];
    check('provider immediately visible', await ids.first().innerText().then(t => t.includes(top.providerName)));
    await ids.first().locator('summary').first().click();
    const firstText = await ids.first().innerText();
    check('reporter and provider explicitly distinguished', firstText.includes('Prestador publicado') && firstText.includes('Parlamentario informante') && firstText.includes('Sin descripción publicada'));
    const advisoryAxe = await new AxeBuilder({ page }).include('dialog[open]').analyze();
    accessibility.push({ view: 'asesorias', violations: advisoryAxe.violations.map(v => ({ id: v.id, impact: v.impact })) });
    check('advisory panel accessible', !advisoryAxe.violations.some(v => ['critical', 'serious'].includes(v.impact)));
    check('official source accessible without fabricated document', await ids.first().getByRole('link', { name: /Consultar fuente institucional/ }).count() > 0);
    await ids.first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: dir + '/screenshots/asesorias-registros.png' });
    await region().getByRole('searchbox', { name: 'Buscar en los registros' }).fill(top.providerName);
    csvRows = await download();
    check('provider search and CSV preserve all matching contracts', csvRows.length === asesorias.rows.filter(r => r.providerName === top.providerName).length && csvRows.every(r => r['Prestador publicado'] === top.providerName));
    await region().getByRole('searchbox', { name: 'Buscar en los registros' }).fill('zzzz-no-publicado');
    check('empty search is explicit', (await region().innerText()).includes('No hay registros que coincidan'));
    await region().getByRole('searchbox', { name: 'Buscar en los registros' }).fill('');
    await page.setViewportSize({ width: 390, height: 844 });
    await ids.first().locator('summary').first().click();
    await ids.first().scrollIntoViewIfNeeded();
    check('mobile drawer and content do not overflow', await panel().evaluate(el => el.getBoundingClientRect().width <= innerWidth && el.scrollWidth <= el.clientWidth + 1));
    await page.screenshot({ path: dir + '/screenshots/asesorias-movil.png' });
    await page.keyboard.press('Escape');
    check('no page exceptions', !errors.length);
    check('no dynamic API or D1', !requests.some(p => /^\/api\/|\/d1\//.test(p)));
    status = 'passed';
}
finally {
    fs.writeFileSync(dir + '/browser-receipt.json', JSON.stringify({ status, base, projectionId: data.projectionId, checks, errors, accessibility, apiRequests: requests.filter(p => p.startsWith('/api/')) }, null, 2));
    await browser.close();
}
console.log(JSON.stringify({ status, checks: checks.length }));
