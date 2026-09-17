import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {describe,it,expect} from 'vitest';

describe('información pública de Movimientos',()=>{
  const page=readFileSync(resolve(process.cwd(),'app/movimientos/page.tsx'),'utf8');
  it('mantiene una única sección de actualización sin errores de conectores',()=>{
    expect(page).not.toContain('sources-health-heading');
    expect(page).toContain('freshness-heading');
    expect(page).not.toContain('no respondió en la última revisión');
    expect(page).not.toContain('La versión anterior se conserva');
    expect(page).not.toContain('frescura.connectors.map');
  });
  it('no convierte respaldo documental en un decreto oficial',()=>{
    expect(page).not.toContain('verificados con decreto');
    expect(page).toContain('con respaldo documental');
  });
});
