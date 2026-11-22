import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import MovementSources from '@/components/movimientos/MovementSources';
import {MovementDate,MovementState} from '@/components/movimientos/MovementPrimitives';
import {MOVIMIENTOS} from './movimientos';
import {buildMovementRegister} from './movement-register-source';
const html=renderToStaticMarkup(createElement(MovementSources,{metadata:{lastSuccess:'2026-11-22T14:58:00Z',lastAttempt:'2026-11-22T14:58:00Z',frequency:'Actualización diaria'}}));
describe('presentación documental de Movimientos',()=>{
 it('concentra actualización y metodología en un solo contexto',()=>{expect((html.match(/id="freshness-heading"/g)??[])).toHaveLength(1);expect(html).toContain('Fuentes y alcance');expect(html).not.toContain('Pipeline diario');expect(html).not.toContain('no respondió en la última revisión');});
 it('explica la diferencia entre corroboración, anuncio y acto oficial',()=>{expect(html).toContain('Corroborado públicamente');expect(html).toMatch(/no equival/);expect(html).toContain('En confirmación');});
 it('no convierte verificado en catálogo en documento oficial individualizado',()=>{const entry=buildMovementRegister([MOVIMIENTOS.find(m=>m.estado==='verificado')!],[])[0];const state=renderToStaticMarkup(createElement(MovementState,{entry}));expect(state).toContain('Respaldo institucional');expect(state).not.toContain('Documento oficial verificado');});
 it('una fecha revisada se identifica como publicación del respaldo',()=>{const entry=buildMovementRegister([MOVIMIENTOS.find(m=>m.id.includes('camila-alonso'))!],[])[0];const date=renderToStaticMarkup(createElement(MovementDate,{entry,basis:'registro'}));expect(date).toContain('hecho en revisión');expect(date).not.toContain('Efectiva informada');});
});
