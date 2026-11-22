import { describe, it, expect } from 'vitest';
import { MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA, isPublicMovementSignal, type Movimiento, type MovimientoSignal } from './movimientos';
import { buildMovementRegister } from './movement-register-source';
import { filterMovementEntries, parseMovementQuery, movementPage, summarizeMovementEntries, validMovementDate, safeMovementUrl, type MovementEntry } from './movement-register';
const rows = buildMovementRegister(MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA.signals);
const query = (q = '') => parseMovementQuery(new URLSearchParams(q));
const search = (q: string = '') => filterMovementEntries(rows, query(q));
describe('registro de Movimientos: conservación documental', () => {
    it('preserva todos los IDs públicos originales sin fusión por nombre', () => {
        expect(rows.map(r => r.id)).toEqual([...MOVIMIENTOS.map(m => m.id), ...MOVIMIENTOS_PIPELINE_METADATA.signals.filter(isPublicMovementSignal).map(s => s.signal_id)]);
        const first = MOVIMIENTOS[0];
        expect(buildMovementRegister([first, { ...first, id: 'otro-hecho' }], [])).toHaveLength(2);
    });
    it('no modifica fechas ni estados en los datos originales', () => { const before = JSON.stringify(MOVIMIENTOS); buildMovementRegister(MOVIMIENTOS, MOVIMIENTOS_PIPELINE_METADATA.signals); expect(JSON.stringify(MOVIMIENTOS)).toBe(before); });
    it('un comunicado y la fecha de revisión no acreditan un acto individualizado', () => {
        const m = MOVIMIENTOS.find(m => m.estado === 'verificado')!;
        const e = buildMovementRegister([m], [])[0];
        expect(e.status).not.toBe('official');
        expect(e.originalStatus).toBe(m.estado);
    });
    it('un acto individualizado sólo es oficial con revisión fechada y estado acreditado', () => {
        const url = 'https://www.bcn.cl/leychile/navegar?idNorma=123456';
        const m = { ...MOVIMIENTOS[0], estado: 'verificado' as const, decreto_url: url, fecha_verificacion: '2026-09-01', fuentes: [{ nivel: 'oficial' as const, medio: 'BCN', url, fecha: '2026-08-30', titulo: 'Decreto' }] };
        expect(buildMovementRegister([m], [])[0].status).toBe('official');
        expect(buildMovementRegister([{ ...m, fecha_verificacion: null }], [])[0].status).not.toBe('official');
    });
    it('conserva la revisión de seis fechas y utiliza publicación como referencia explícita', () => {
        const r = rows.filter(r => r.review);
        expect(r).toHaveLength(6);
        expect(r.every(e => e.effectiveDate === null && e.date === e.publishedDate && e.dateLabel.includes('revisión'))).toBe(true);
    });
    it('el anuncio conserva por separado publicación y fecha efectiva reportada', () => { const e = rows.find(r => r.name === 'Kattia Durán')!; expect(e.publishedDate).toBe('2026-09-30'); expect(e.effectiveDate).toBe('2026-10-01'); expect(e.dateLabel).toBe('Efectiva reportada'); expect(e.status).toBe('pending'); });
    it('un anuncio sin fecha efectiva no la inventa desde su publicación', () => { const e = rows.find(r => r.name === 'José Bravo Burgos')!; expect(e.effectiveDate).toBeNull(); expect(e.dateLabel).toBe('Publicación del anuncio'); });
    it('no elimina un anuncio sin persona o fecha', () => { const s = { ...MOVIMIENTOS_PIPELINE_METADATA.signals[0], signal_id: 'sin-datos', person_name: undefined, date: null, effective_date: undefined } as MovimientoSignal; const [e] = buildMovementRegister([], [s]); expect(e.name).toBeNull(); expect(e.date).toBeNull(); expect(e.summary).toBeTruthy(); });
    it('las fuentes relacionadas se mantienen en un único caso sin duplicar el enlace idéntico', () => { const s = MOVIMIENTOS_PIPELINE_METADATA.signals[0]; const [e] = buildMovementRegister([], [{ ...s, related_sources: [{ source_label: s.source_label, source_tier: s.source_tier, title: s.title, url: s.url!, date: s.date }] }]); expect(e.sources).toHaveLength(1); });
    it('no presenta la prensa como documento oficial', () => { expect(rows.flatMap(r => r.sources).filter(s => s.kind === 'press').length).toBeGreaterThan(0); expect(buildMovementRegister([{ ...MOVIMIENTOS[0], fuentes: [{ nivel: 'prensa', medio: 'Diario', url: 'https://example.test/a.pdf', fecha: '2026-01-01', titulo: 'Noticia' }] } as Movimiento], [])[0].sources[0].kind).toBe('press'); });
    it('el conteo oficial no incluye los anuncios ni la corroboración pública', () => { const s = summarizeMovementEntries(rows); expect(s.total).toBe(rows.length); expect(s.official).toBe(rows.filter(e => e.status === 'official').length); expect(s.pending).toBe(5); expect(s.official).toBeLessThan(MOVIMIENTOS.filter(m => m.estado === 'verificado').length); });
});
describe('identificación y orden documental',()=>{
 it('la cronología mantiene orden temporal aunque el registro estuviera ordenado por nombre',()=>{expect(query('vista=cronologia&orden=nombre').sort).toBe('reciente');expect(query('vista=timeline&orden=antiguo').sort).toBe('antiguo');expect(query('vista=tabla&orden=nombre').sort).toBe('nombre');});
 it('un nombramiento distingue la autoridad entrante de la anterior',()=>{const m={...MOVIMIENTOS[0],tipo_evento:'nombramiento' as const,tipo:'nombramiento' as const};const [e]=buildMovementRegister([m],[]);expect(e.name).toBe(m.entro?.nombre);expect(e.otherName).toBe(m.salio?.nombre);expect(e.otherNameIsIncoming).toBe(false);});
 it('los registros sin persona identificada van al final al ordenar por nombre',()=>{const unknown={...rows[0],id:'sin-persona',name:null,summary:'AAA'};expect(filterMovementEntries([unknown,...rows],query('orden=nombre')).at(-1)?.id).toBe('sin-persona');});
 it('permite buscar el identificador de un documento en el respaldo publicado',()=>{const source=MOVIMIENTOS.flatMap(m=>m.fuentes).find(s=>s.url.includes('idNorma='))!;const id=new URL(source.url).searchParams.get('idNorma')!;expect(search('q='+id).length).toBeGreaterThan(0);});
});
describe('consultas locales y enlaces compatibles', () => {
    it('busca nombres sin tildes, sin mayúsculas y con tokens en cualquier orden', () => { expect(search('q=uran').some(e => e.name === 'Kattia Durán')).toBe(true); expect(search('q=DURAN+KATTIA').map(e => e.name)).toContain('Kattia Durán'); });
    it('busca institución, región y cargo realmente publicados', () => { expect(search('q=salud').length).toBeGreaterThan(0); expect(search('q=Atacama').length).toBeGreaterThan(0); expect(search('q=seremi').length).toBeGreaterThan(0); });
    it('combina opciones múltiples mediante OR y categorías mediante AND', () => { const result = search('tipo=renuncia&tipo=remocion&region=Atacama'); expect(result.length).toBeGreaterThan(0); expect(result.every(r => ['renuncia', 'remocion'].includes(r.type) && r.region === 'Atacama')).toBe(true); });
    it('acepta el filtro de ministerio de enlaces anteriores y el motivo exacto', () => { const row = rows.find(r => r.reason)!; expect(search('ministerio=' + encodeURIComponent(row.ministry)).some(r => r.id === row.id)).toBe(true); expect(search('motivo=' + encodeURIComponent(row.reason)).every(r => r.reason === row.reason)).toBe(true); });
    it('conserva estado=verificado y verificado=true con el alcance anterior', () => { expect(search('estado=verificado').length).toBe(MOVIMIENTOS.length); expect(search('verificado=true')).toEqual(search('estado=verificado')); });
    it('distingue estado pendiente de fuente institucional', () => { const pending = search('estado=en_confirmacion'); expect(pending).toHaveLength(5); expect(pending.some(e => e.sources.some(s => s.kind === 'institutional'))).toBe(true); });
    it('filtra por publicación o fecha efectiva sin sustituir una por otra', () => { expect(search('q=Kattia&fecha=publicacion&mes=2026-09')).toHaveLength(1); expect(search('q=Kattia&fecha=efectiva&mes=2026-09')).toHaveLength(0); expect(search('q=Kattia&fecha=efectiva&desde=2026-10-01&hasta=2026-10-01')).toHaveLength(1); });
    it('no pasa fechas inexistentes ni rangos invertidos', () => { expect(validMovementDate('2026-02-30')).toBeNull(); expect(validMovementDate('2026-02-28')).toBe('2026-02-28'); expect(search('desde=2026-11-01&hasta=2026-01-01')).toEqual([]); });
    it('muestra los últimos registros primero y permite orden por nombre', () => { const s = search(); const dates = s.map(r => r.date).filter(Boolean); expect(dates).toEqual([...dates].sort().reverse()); const names = search('orden=nombre').map(r => r.name ?? r.summary); expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'es-CL'))); });
    it('paginar no excluye ningún ID y limita el tamaño de la página', () => { const all = search(), ids = []; for (let p = 1; p <= Math.ceil(all.length / 20); p++) {
        const page = movementPage(all, p);
        expect(page.rows.length).toBeLessThanOrEqual(20);
        ids.push(...page.rows.map(r => r.id));
    } expect(ids).toEqual(all.map(r => r.id)); expect(movementPage(all, 999).page).toBe(Math.ceil(all.length / 20)); });
    it('sin fecha permanece consultable sin rango y se ordena al final', () => { const e = { ...rows[0], id: 'undated', date: null } as MovementEntry; expect(filterMovementEntries([e, ...rows], query()).at(-1)?.id).toBe('undated'); expect(filterMovementEntries([e], query('desde=2026-01-01'))).toEqual([]); });
    it('conserva ambas vistas antiguas', () => { expect(query('vista=tabla').view).toBe('registro'); expect(query('vista=timeline').view).toBe('cronologia'); });
    it('no admite enlaces ejecutables o con credenciales', () => { expect(safeMovementUrl('javascript:alert(1)')).toBeNull(); expect(safeMovementUrl('https://user:password@example.com')).toBeNull(); expect(safeMovementUrl('https://www.minsal.cl/a')).toBe('https://www.minsal.cl/a'); });
});
