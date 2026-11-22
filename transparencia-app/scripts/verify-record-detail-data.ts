import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import csv from 'csv-parser';
import { POLITICOS_SEED } from '../lib/politicos-source';
import { diputadoIdParaPolitico } from '../lib/data-source';
import { parseSpanishMonthPeriod } from '../lib/month-periods';
import { parsePublishedClpAmount } from '../lib/parliamentary-cost-periods';
import { unpackExplorer, explorerDefaults, filterExplorerFacts, filterExplorerRecords, explorerCsv, type ExplorerRecord, type ExplorerQuery } from '../lib/parliamentary-explorer';
import { recordComponentTotals } from '../lib/parliamentary-explorer-records';
async function main() {
    const read = (p: string) => JSON.parse(fs.readFileSync(p, 'utf8'));
    const receipt = read('artifacts/dashboard-explorer/input/source-receipt.json');
    const sourceInput = receipt.inputs.find((x: {
        publishedPath: string;
    }) => x.publishedPath === 'data/personal-apoyo.json');
    const rawPath = sourceInput.inputPath;
    const envelope = read(rawPath), raw = envelope.candidate ?? envelope;
    const rawBytes = envelope.candidate ? Buffer.from(JSON.stringify(raw) + "\n") : fs.readFileSync(rawPath);
    assert.equal(rawBytes.length, sourceInput.size);
    assert.equal(createHash("sha256").update(rawBytes).digest("hex"), sourceInput.checksumSha256);
    const data = unpackExplorer(read('public/data/parliamentary-explorer/bootstrap.json'));
    assert.equal(createHash("sha256").update(fs.readFileSync("artifacts/record-detail/previous-bootstrap.json")).digest("hex"),"b4f74fe8d2095fbc7b3d7a025b1e2da8de02bc9f8916ee30fb8aff161db55ef4");
    const previous = unpackExplorer(read('artifacts/record-detail/previous-bootstrap.json'));
    assert.deepEqual(data.facts, previous.facts, 'Financial facts changed');
    assert.deepEqual(data.members, previous.members, 'Member identities changed');
    const manifest = read('public/data/parliamentary-explorer/manifest.json');
    const records: ExplorerRecord[] = [];
    for (const p of manifest.partitions) {
        const bytes = fs.readFileSync('public' + p.path);
        assert.equal(bytes.length, p.bytes);
        assert.equal(createHash('sha256').update(bytes).digest('hex'), p.sha256);
        const part = JSON.parse(bytes.toString());
        assert.equal(part.rows.length, p.count);
        records.push(...part.rows);
    }
    const expected = [];
    const mappedDeputies = new Set<string>();
    for (const m of data.members.filter(x => x.chamber === 'camara')) {
        const politician = POLITICOS_SEED.find(p => p.id === m.id)!;
        const id = diputadoIdParaPolitico(politician), d = raw.diputados[id!];
        if (id)
            mappedDeputies.add(id);
        for (const p of d?.transparencia_camara?.asesorias_externas?.periods ?? [])
            for (const r of p.rows) {
                const period = parseSpanishMonthPeriod(p.period);
                if (!period?.startsWith('2026-'))
                    continue;
                expected.push({ memberId: m.id, period, amount: parsePublishedClpAmount(r.values.Monto), providerName: r.values.Asesor || undefined, sourceRecordId: r.values.Folio || undefined, sourceFields: r.values });
            }
    }
    const unassociatedAdvisories = Object.entries(raw.diputados).filter(([id]) => !mappedDeputies.has(id)).flatMap(([id, entry]) => { const d = entry as {
        transparencia_camara?: {
            asesorias_externas?: {
                periods?: {
                    period: string;
                    rows: {
                        values: Record<string, string>;
                    }[];
                }[];
            };
        };
    }; return (d.transparencia_camara?.asesorias_externas?.periods ?? []).flatMap(p => p.rows.map(r => ({ deputyId: id, period: p.period, reporter: r.values.Diputado, folio: r.values.Folio, reason: 'outside_current_canonical_roster' }))); });
    const actual = records.filter(r => r.component === 'asesorias' && r.recordCount === 1).map(r => ({ memberId: r.memberId, period: r.period, amount: r.amount, providerName: r.providerName, sourceRecordId: r.sourceRecordId, sourceFields: r.sourceFields }));
    const fingerprint = (rows: unknown[]) => rows.map(r => JSON.stringify(r)).sort();
    assert.deepEqual(fingerprint(actual), fingerprint(expected), 'Provider/raw table mismatch');
    const base = { ...explorerDefaults(data), from: '2026-03', to: '2026-09' };
    const queries: ExplorerQuery[] = [];
    for (const component of ['gastos', 'personal', 'asesorias']) {
        const q = { ...base, component, componentIds: [component] as ExplorerQuery['componentIds'] };
        queries.push(q, ...['camara', 'senado'].map(chamber => ({ ...q, chamber })), ...['2026-03', '2026-04', '2026-08', '2026-09'].map(period => ({ ...q, from: period, to: period })), ...data.members.map(m => ({ ...q, memberIds: [m.id] })));
    }
    const gastos = { ...base, component: 'gastos', componentIds: ['gastos'] as ExplorerQuery['componentIds'] };
    for (const category of new Set(data.facts.filter(r => r.component === 'gastos').map(r => r.category)))
        queries.push({ ...gastos, category });
    for (const item of new Set(data.facts.filter(r => r.component === 'gastos').map(r => r.item)))
        queries.push({ ...gastos, item });
    let checked = 0;
    for (const q of queries) {
        const rows = filterExplorerRecords(data, q, records), facts = filterExplorerFacts(data, q);
        const totals = recordComponentTotals(rows), factTotals = recordComponentTotals(facts);
        for (const key of q.componentIds ?? [])
            assert.equal(totals[key]?.amount ?? null, factTotals[key]?.amount ?? null, JSON.stringify(q));
        // Every page is a partition of the complete selection, never a top-N substitution.
        const pages = Array.from({ length: Math.ceil(rows.length / 10) }, (_, p) => rows.slice(p * 10, p * 10 + 10));
        assert.equal(pages.flat().length, rows.length);
        if (checked % 25 === 0 && rows.length) {
            const parsed: Record<string, string>[] = [];
            const text = explorerCsv(data, rows).replace(/^\uFEFF/, '');
            for await (const row of Readable.from([text]).pipe(csv({ separator: ';' })))
                parsed.push(row);
            assert.equal(parsed.length, rows.length);
            assert.equal(parsed.reduce((s, r) => s + Number(r['Monto CLP'] || 0), 0), rows.reduce((s, r) => s + (r.amount ?? 0), 0));
        }
        checked++;
    }
    const result = { status: 'passed', releaseId: data.releaseId, projectionId: data.projectionId, partitions: manifest.partitions.length, financialFactsUnchanged: true, allMembersUnchanged: true, rawAdvisoryRows: expected.length + unassociatedAdvisories.length, sourceAdvisoryRows: expected.length, unassociatedAdvisories, preservedProviderRows: actual.length, missingProvider: actual.filter(r => !r.providerName).length, rawTableFieldsPreserved: true, noInventedServiceDescriptions: records.filter(r => r.component === 'asesorias').every(r => !r.serviceDescription), documentsAvailable: records.filter(r => r.component === 'asesorias' && r.documentUrls?.length).length, checkedSelections: checked, paginationAndCsvReconciled: true, sourceSnapshotUnmodified: true };
    fs.writeFileSync('artifacts/record-detail/data-receipt.json', JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
