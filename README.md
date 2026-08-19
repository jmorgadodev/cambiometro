# El Cambiómetro — Plataforma de datos públicos de Chile

> Compila y cruza 1.753.013 registros de 11 fuentes oficiales del Estado chileno: Congreso, ministerios, municipalidades, Contraloría, SERVEL, InfoLobby y más.

## Qué contiene

- **346 municipalidades**: nómina detallada, presupuestos SINIM, compras OCDS, lobby, informes CGR
- **205 parlamentarios**: asistencia, votaciones, gastos operacionales, personal de apoyo, declaraciones DIP
- **538 servicios públicos**: dotación, presupuesto, directores
- **18 partidos políticos**: bancadas, asistencia, gastos
- **Cruces**: LOBBY+VENTAS, puerta giratoria, nepotismo

## Fuentes oficiales

| Fuente | URL | Frecuencia |
|--------|-----|------------|
| Cámara de Diputados | camara.cl | Diario |
| Senado | senado.cl | Diario |
| BCN | bcn.cl | Diario |
| CPLT | cplt.cl | Semanal |
| ChileCompra | chilecompra.cl | Mensual |
| SERVEL | servel.cl | Mensual |
| SINIM | sinim.gob.cl | Mensual |
| InfoLobby | infolobby.cl | Semanal |
| InfoProbidad | infoprobidad.cl | Semanal |
| DIPRES | dipres.gob.cl | Mensual |
| CGR | contraloria.cl | Mensual |

## Reglas de integridad de datos

- **Sanity global**: todo agregado === suma de sus partes (build rojo si falla)
- **Jerarquía de fuentes**: T1 (Diario Oficial) > T2 (fuente oficial) > T3 (prensa verificada)
- **Append-only**: snapshots diarios, nunca se borra ni sobrescribe (memoria histórica)
- **Cero datos sintéticos**: todo viene de fuentes públicas verificables
- **Coherencia matemática**: totales cuadran con sus componentes

## Arquitectura

- **Stack**: Next.js + Cloudflare Workers + R2 + D1
- **ETLs**: 11 pipelines diarios/semanales/mensuales
- **Tests**: 479 tests automatizados (typecheck + vitest)
- **Deploy**: Cloudflare Pages (zero-downtime)

## Desarrollo local

```bash
npm install
npm run etl              # ETL completo diario
npm run ingest:cplt-personal  # 3 invocaciones CPLT
npm test                 # 479 tests
npm run deploy           # deploy a Cloudflare
```

## Licencia

AGPL-3.0 — ver [LICENSE](LICENSE)

## Contacto

- General: hola@impulsacv.cl
- Privacidad y datos (Ley 21.715): datos@impulsacv.cl