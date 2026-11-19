# Fase 7 · Dashboard parlamentario local

19-11-2026. Base `39cc06d05e110ecd795e56d4d3726ff16f01a13a`, rama `codex/dashboard-parlamentario-local-20261119`. Implementado en la raíz canónica. Sin push, PR, workflows, publicación ni extracción ETL.

## Entrega

`/dashboard`, con acceso secundario desde Cámara. Filtros combinados por cámara, parlamentario, rango mensual, componente, categoría de lectura e ítem. URL compartible e historial; reinicio de selecciones incompatibles. Evolución mensual con huecos para ausencias y tabla mensual accesible; categorías con acceso al detalle; tabla ordenable/paginada y CSV de todas las filas filtradas, no sólo de la página visible. Gráfico y tabla desplazables en móvil; temas paper/dark/night con tokens existentes.

No hay costo conjunto entre asignaciones potencialmente solapadas. Los acumulados conocidos indican cobertura; las dietas se presentan como referencias individuales con su mes oficial, no como pagos imputados ni como una serie histórica completa de reajustes. Asesorías externas sólo donde existe ese desglose; Senado no recibe importes inventados. El catálogo corresponde a las 205 autoridades de la nómina vigente; no equivale a todo el gasto del Congreso ni a todas las autoridades de 2026.

## Entradas reutilizadas

ReleaseSet publicado `5cd0a3da19dddbbcccc9ef8a12215bc35e9f0cde00c239892b48ab25225cd9bf`. El preparador verifica SHA256 y tamaño exactos de Gastos Cámara/Senado y Personal contra el pin antes de normalizar. Los tres archivos guardados coinciden con los bytes publicados; no se usaron los JSON Git antiguos como sustituto.

Dietas: lectura de manifest.json e history/index.json de `https://ddbe1173.cambiometro.pages.dev/data/remuneraciones-38bis/`, sin consultar nuevamente el origen. Proyección mediante buildParliamentarySalaryView existente: 205 referencias, 155 de julio y 50 de junio de 2026. Recibo separado porque esta proyección de remuneraciones no está incluida en el pin estático de Gastos/Personal.

| Componente | Filas derivadas | Autoridades con importe | Cortes incorporados |
|---|---:|---:|---|
| Gastos | 28.215 | 205 | enero–agosto 2026, cobertura distinta por autoridad |
| Personal | 1.629 | 204 | enero–septiembre 2026, cobertura distinta por autoridad |
| Asesorías externas | 348 | 54 | enero–septiembre 2026, cobertura parcial |
| Dieta de referencia | 205 | 205 | junio/julio 2026, un mes real por persona |

Total: 30.397 filas derivadas para análisis; no es un conteo de documentos o personas únicas. Personal puede conservar observaciones sin importe. La tabla mensual informa la cobertura de cada corte.

Artefactos locales ignorados: `transparencia-app/artifacts/dashboard/` contiene input-receipt.json, salary-receipt.json, local-data.json, coverage.json, profile-parity.json, browser-receipt.json, themes-accessibility.json, capturas y build-final.log. No versionar snapshots ni convertirlos en datos remotos.

## Validación

- 33 pruebas en cinco archivos: filas TOTAL, ajustes negativos, ausencia/cero, enero/febrero, fechas y filtros, exportación segura, override local y divergencia respecto del pin. El corte por defecto de Partidos sigue en marzo.
- Tipos y lint de archivos afectados aprobados; guards de arquitectura, colores, enlaces y HTML sin inyección aprobados.
- Navegador real sobre Next y sobre su exportación estática: 13 recorridos, 1440/390/320 px, filtros, historial, recarga, CSV con más de 50 filas, estado vacío y paginación; sin errores JS ni desbordamiento de página. Navegación desde categorías y acceso desde Cámara comprobados aparte.
- Paridad financiera: 30 importes/períodos de las fichas publicadas de Carlos Bianchi y Vanessa Kaiser preservados; 9 y 7 meses respectivamente, con dietas julio/junio.
- Compilación Next completa con webpack, tipos y exportación de 4.886 páginas. El Dashboard usa el bundle local verificado; otras páginas conservan entradas locales. Este build de revisión no es un artefacto autorizado para producción.
- Accesibilidad: revisión de los tres temas; se corrigió el contraste del enlace de retorno en oscuro. Recibo final en themes-accessibility.json.

El intento inicial de build selectivo de Next no incluyó rutas App Router en este entorno Windows; no se contó como validación. Se utilizó la compilación completa. No repetir extracciones para resolver un problema de interfaz.

## Revisión y comandos

La revisión estática actual se sirve en `http://127.0.0.1:3017/dashboard/`. Para editar con Next, desde transparencia-app, usar un puerto libre:

```powershell
$env:CAMBIOMETRO_DASHBOARD_LOCAL_DATA='artifacts/dashboard/local-data.json'
npm run dev -- --hostname 127.0.0.1 --port 3018
```

Preparación reproducible con los archivos ya guardados (una sola línea, desde transparencia-app):

```powershell
node scripts/prepare-dashboard-local.mjs --release-set artifacts/voting-panel/published-final/final-release-set.json --camara artifacts/expense-candidates/camara-auto-review-1795036382672/reviewed-envelope.json --senado artifacts/expense-candidates/senado-auto-1795047921334/reviewed-envelope.json --personal artifacts/personal-candidates/baseline-verificada-20261118/candidate.json --salary artifacts/dashboard/salary-reference.json --salary-receipt artifacts/dashboard/salary-receipt.json
```

```powershell
node node_modules/vitest/vitest.mjs run lib/parliamentary-dashboard.test.ts lib/parliamentary-dashboard-data.test.ts lib/party-support.test.ts lib/parliamentary-cost-periods.test.ts lib/gastos-operacionales.test.ts --configLoader native --no-cache
node scripts/verify-dashboard-local.mjs
```

El verificador usa el bundle local y puerto 3017 por defecto; CAMBIOMETRO_DASHBOARD_BASE_URL permite otro puerto local. Para reconstruir la revisión: establecer el override local anterior y ejecutar `node node_modules/next/dist/bin/next build --webpack`. No usar ese override en publicación: el adaptador lo rechaza si CAMBIOMETRO_PUBLISHED_RELEASE_ONLY=1.

## Próxima entrega y recuperación

Fase 7 implementada y revisada en local; pendiente de revisión de Jorge y futura fase 9. Entonces hidratar el release vigente y repetir la paridad pertinente, construir preview y promover el mismo artefacto únicamente cuando se solicite. No reutilizar esta exportación con entradas locales de otros módulos para desplegar.

Reversión: retirar el enlace de Cámara y los archivos nuevos del Dashboard; el parámetro de período mínimo de buildMemberSupport conserva marzo por defecto. No requiere revertir datos, ETL o contratos públicos. Producción permanece en la entrega #848.
