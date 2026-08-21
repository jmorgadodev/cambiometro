# MD — AUDITORÍA COMPLETA DE INTEGRIDAD DE DATOS
Proyecto: El Cambiómetro (cambiometro.impulsacv.cl)
Rama de trabajo: audit/datos-completa (NUNCA main, NUNCA merge)
Fecha: 19-ago-2026

## 0. CONTEXTO
Sitio cívico que consolida 11 fuentes oficiales chilenas. Antes del
launch público (1-sep-2026) se debe certificar que TODO número
publicado coincide con su fuente oficial. Se detectó al menos un bug
sistémico conocido (caso Kaiser, sección 6). Esta auditoría es de
DIAGNÓSTICO: no aplica fixes; entrega informe + causas raíz + fixes
propuestos.

Rutas clave:
- App/ETLs: transparencia-app/ (scripts/etl/, workers/etl/, app/)
- Lake de referencia diagnóstica (solo lectura, corte ago-2026):
  C:\Users\jorge\Proyectos\transparencia.impulsacv.cl_\transparencia-app\data\lake\
- Proyecciones trackeadas: transparencia-app/data/lake/projections/
- Sitio público: https://cambiometro.impulsacv.cl
- Esta máquina tiene IP residencial: senado.cl y camara.cl responden
  aquí (GitHub Actions y Cloudflare están bloqueados por su WAF).

## 1. REGLAS DE OPERACIÓN
1. Todo el trabajo en rama audit/datos-completa. Prohibido tocar main,
   prohibido merge, prohibido deploy.
2. Prohibido modificar ETLs, frontend o datos. Solo se crean archivos
   en scripts/audit/ y docs/auditoria/.
3. Rate limit propio: máx 1 req/seg por fuente oficial; reintentos con
   backoff exponencial ante 429/503; si una fuente no responde tras 3
   intentos, registrar como "FUENTE_NO_DISPONIBLE" y continuar.
4. Cero secrets en los scripts/commits.
5. Commits convencionales (feat:, docs:, chore:) en la rama de auditoría.
6. Los scripts de auditoría deben ser DETERMINISTAS y reutilizables:
   más adelante se convertirán en los guards permanentes del ETL.
   Deben correr con `node scripts/audit/<nombre>.mjs` y salir con
   exit≠0 si existen discrepancias CRITICAS.

## 2. UNIVERSO A AUDITAR (100%, sin muestreo)
- 50 senadores + 155 diputados (lista desde nóminas oficiales BCN/SERVEL).
- Todos los meses publicados de 2026 por cada métrica.
- 538 servicios públicos (totales; 10% de filas individuales).
- 346 municipalidades (totales por comuna).
- Todos los agregados del sitio: por partido, coalición, región, cámara
  y totales nacionales (rankings incluidos).

## 3. VALIDACIONES DURAS (reglas, sin APIs externas)
V1 GASTOS OPERACIONALES: suma de ítems == total oficial publicado por
   la fuente (tolerancia $0). Diferencia ≠ 0 → CRITICA.
V2 PERSONAL DE APOYO: suma de sueldos vs asignación oficial base:
   - suma > asignación → ALTA ("excede asignación base; verificar
     traspaso permitido de hasta 40% de gastos operacionales").
   - suma > asignación × 1.4 → CRITICA.
V3 VOTACIONES: total == a favor + en contra + abstenciones +
   presente sin votar. Fallo → CRITICA.
V4 ASISTENCIA: numerador ≤ denominador ≤ total de sesiones oficiales
   del período; porcentaje recalculado debe coincidir con el publicado
   (±0.5 pp). Fallo → ALTA.
V5 AGREGADOS (G6): todo total/ranking por partido, coalición, región o
   nacional == suma de sus componentes ($0 / conteo 0). Fallo → CRITICA.
V6 IDENTIDAD: nombre, RUT (si aplica), partido y cargo coinciden entre
   BCN, fuente de cámara/senado y el sitio. Diferencia de texto → MENOR;
   RUT o partido distinto → ALTA.
V7 PLAUSIBILIDAD: sueldo_mensual ≤ $60M; horas_extras ≤ 300/mes;
   monto_relación ≤ total anual del organismo; gastos operacionales
   mensuales dentro de la asignación regional vigente ×1.4. Fallo → ALTA.

## 4. FASES DE TRABAJO

### FASE A — LINAJE (docs/auditoria/00-linaje.md)
Para cada campo numérico publicado: fuente oficial → script ETL exacto
(archivo:línea) → tabla D1 → componente frontend (archivo:línea).
Cobertura obligatoria: gastos operacionales, personal de apoyo,
asistencia, votaciones, dietas/patrimonio, dotación servicios,
presupuestos municipales, compras.

### FASE B — PARLAMENTARIOS 100% (scripts/audit/audit-parlamentarios.mjs)
Por cada senador/diputado y cada mes publicado 2026:
B1 Gastos Senado: scrapea senado.cl/transparencia/
   gastos-operacionales-senadores (selector año/mes/parlamentario);
   extrae TOTAL OFICIAL + ítems; aplica V1 contra lake de referencia y
   contra lo publicado en la ficha /politico/[slug].
B2 Gastos Cámara: idem contra camara.cl (página consolidada de
   transparencia activa y fichas por diputado); aplica V1.
B3 Personal de apoyo: senado.cl/transparencia/personal-de-apoyo-senadores
   y equivalente Cámara; extrae contratos + asignación oficial; aplica V2.
B4 Asistencia/votaciones: API de sala de Senado y registros de Cámara;
   aplica V3 y V4.
B5 Identidad: aplica V6.
Salida: docs/auditoria/01-parlamentarios.json (entidad, mes, campo,
valor_sitio, valor_oficial, diferencia, validación, severidad) +
01-resumen.md con conteos por severidad.

### FASE C — AGREGADOS Y ENTIDADES (scripts/audit/audit-agregados.mjs,
audit-entidades.mjs)
C1 Recorre rankings y totales del sitio; aplica V5.
C2 Servicios (538): totales de dotación/presupuesto vs DIPRES; aplica
   V5 y V7; 10% de filas individuales verificadas contra fuente.
C3 Municipalidades (346): totales SINIM vs suma de ítems; compras
   ChileCompra por comuna vs suma de órdenes; aplica V5 y V7.
Salida: 02-agregados.json, 03-entidades.json + resúmenes .md.

### FASE D — CAUSA RAÍZ (docs/auditoria/04-causas-raiz.md)
Por cada discrepancia CRITICA/ALTA: abrir el ETL correspondiente,
trazar la transformación (HTML/JSON oficial → parser → normalización →
D1 → frontend), señalar la línea exacta del bug, proponer fix + test
que lo cubra. NO aplicar el fix.

### FASE E — INFORME FINAL (docs/auditoria/INFORME-FINAL.md)
1. Resumen ejecutivo: entidades auditadas, discrepancias por severidad,
   % de datos correctos por categoría.
2. Tabla de CRITICAS con causa raíz y fix propuesto.
3. ¿El patrón Kaiser es sistémico? (cuántos parlamentarios lo presentan).
4. Veredicto de launch: SI / NO / CON FIXES (listar).
5. Lista de validaciones V1-V7 que deben quedar como guards permanentes
   del ETL (input para el siguiente milestone).

## 5. CONTROL DE METODOLOGÍA (obligatorio)
El auditor DEBE detectar por sí mismo los 2 casos conocidos. Si no los
detecta, la metodología está mal y debe corregirse antes de confiar en
el resto del informe:
- Caso 1: V. Kaiser, gastos operacionales may-2026: oficial $4.582.550,
  suma de ítems $9.165.100 → debe salir CRITICA (V1).
- Caso 2: V. Kaiser, personal jul-2026: asignación $11.406.149, suma de
  sueldos $15.250.000 → debe salir ALTA (V2).

## 6. ENTREGABLES FINALES
- scripts/audit/*.mjs (deterministas, exit≠0 si CRITICAS)
- docs/auditoria/00-linaje.md
- docs/auditoria/01-parlamentarios.json + 01-resumen.md
- docs/auditoria/02-agregados.json + 02-resumen.md
- docs/auditoria/03-entidades.json + 03-resumen.md
- docs/auditoria/04-causas-raiz.md
- docs/auditoria/INFORME-FINAL.md
Al terminar: push de la rama audit/datos-completa (sin merge) y pegar
el INFORME-FINAL.md completo en el chat.

## 7. PRECISIONES DE EJECUCIÓN APROBADAS
1. La única autoridad de verdad es la fuente oficial actual. El lake
   archivado se usa exclusivamente para diagnosticar en qué capa nace
   una divergencia y nunca se modifica ni se copia al repositorio.
2. Jerarquía de comparación: fuente oficial actual → proyección
   trackeada → lake archivado → sitio publicado. Toda diferencia entre
   capas consecutivas se registra como hallazgo.
3. La capa sitio se extrae desde el payload RSC `text/x-component` del
   App Router. El endpoint `/_next/data` no existe para estas rutas
   dinámicas. Solo cinco fichas se contrastan además contra HTML visible
   para validar que el parser RSC refleja lo renderizado.
4. SINIM 345/346 se registra como hallazgo de cobertura; no se rellena
   ni interpola.
5. Checkpoints obligatorios en el chat tras A, B y C. Si B no termina
   antes de cuatro horas se informa avance. Si la ejecución supera ocho
   horas antes de cerrar C, cualquier reducción de muestreo de 10% a 5%
   requiere aprobación expresa.
