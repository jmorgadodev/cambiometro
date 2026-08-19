# CONTEXT — Estado vivo del proyecto

**Última actualización:** 2026-08-19 03:31 CLT
**Último agente:** OpenCode DeepSeek

## HITOS COMPLETADOS

### SN-FINAL (repo público) ✅
- Repo público: https://github.com/jmorgadodev/cambiometro (PÚBLICO)
- Repo viejo: jmorgadodev/transparencia.impulsacv.cl (ARCHIVADO)
- CI Quality: verde (run 32223582979)
- ETL: conocido issue WAF camara.cl (docs/etl-known-issues.md)
- Licencia: AGPL-3.0
- Minutos GitHub: ILIMITADOS (repo público)
- Commit snapshot: d8e358b

### GEMINI_KEY ✅
- Rotada en Script Properties de Apps Script

## ESTADO ACTUAL DEL SITIO

- URL producción: https://cambiometro.impulsacv.cl
- Datos: corte agosto 2026 (último ETL exitoso)
- Rutas: 429 generadas en build
- Tests: 479 passing (89 archivos)
- Bundle: 2.5 MB total en 37 chunks; chunk mayor 1115.3 kB

## STACK DE MDs PENDIENTES (Opción A: prioridad técnica)

### FASE 1: Protección legal (URGENTE, Ley 21.715 vigente 14-dic)
- [ ] **Seguridad + Ley 21.715** (headers CSP, formularios, tratamiento datos)
  - Brief listo: S1
  - Sin dependencias, puede ejecutarse ya

### FASE 2: Indexación (crítico para launch 1-sep)
- [ ] **SEO v1+v2** (slugs, sitemap, JSON-LD, GSC, GA4, landings /preguntas y /rankings)
  - Brief listo: SEO v1+v2
  - Sin dependencias, puede ejecutarse en paralelo con Seguridad

### FASE 3: UI responsive (mejora continua)
- [ ] **Maestro móvil** (M10-M37: globales G1-G8 + módulos)
  - Brief listo: MD maestro con 37 módulos
  - Requiere FASE 1 completada (para no romper lo que ya funciona)

### FASE 4: Retención (post-launch)
- [ ] **Newsletter** (motor de diff + suscripción + envío)
  - Brief listo: NL
  - Requiere sitio estable

### FASE 5: Memoria histórica (diferenciador)
- [ ] **MC v4** (reemplazos parlamentarios + memoria append-only)
  - Brief listo: MC v3+v4
  - Requiere Calendario v3 (ETL semanal)

### FASE 6: Comercial (captar clientes)
- [ ] **CS /caso** (vitrina técnica + deck descargable)
  - Brief listo: CS
  - Requiere métricas de launch (post-1-sep)

## REGLAS VIGENTES (NO ROMPER)

### R7 — Deploy obligatorio
Todo bloque de código termina con `npm run deploy` + Cloudflare Version ID + confirmación en URL pública. Sin deploy, el bloque NO está completo.

### R8 — Un push por milestone
Un push a master por milestone; revisión del usuario SIEMPRE en producción (datos reales).

### R9 — Evidencia renderizada
Capturas 320/390px + conteos DOM; los tests unitarios no reemplazan capturas.

### R10 — Cero datos sintéticos
PROHIBIDO datos sintéticos/seeds en código; subsets reales en archivos pequeños ya existen.

### SN0 — Cero rastros de IA
- Nombres de herramientas PROHIBIDOS en código, commits, ramas, docs commiteados
- Comentarios solo el "por qué", nunca el "qué"
- Commits convencionales: feat:, fix:, chore:, docs:, refactor:
- Tests en CI: scripts/check-no-ai-traces.mjs + check-no-private-assets.mjs

### G6 — Sanity global
Todo agregado === suma de sus partes (build rojo si falla). Reglas:
- sueldo_mensual ≤ $60M
- horas_extras ≤ 300/mes
- monto_relación ≤ total anual del organismo

### SN0.8 — Verificación de CI remoto
Todo commit que afecte CI debe verificar no solo gates locales sino también el workflow remoto en verde (`gh run view`) antes de reportar como completado. CI fallido = fase no cerrada.

## PROTOCOLO DE HANDOVER ENTRE AGENTES

Cuando un agente termina o se queda sin tokens:

1. **Agente saliente** crea `docs/HANDOVER-NOTES/YYYY-MM-DD-{tema}.md`:
   - Qué hizo (commits, archivos modificados)
   - Qué falta (siguiente paso exacto)
   - Bloqueos (si hay)
   - Próximos pasos (instrucciones para el siguiente agente)

2. **Agente entrante** lee:
   - `docs/CONTEXT.md` (este archivo)
   - Último archivo en `docs/HANDOVER-NOTES/`
   - `docs/decisions/` (si hay decisiones relevantes)

3. **Usuario** verifica que el siguiente agente tenga contexto completo antes de autorizar ejecución.

## DECISIONES RECIENTES

| Fecha | Decisión | Razón |
|---|---|---|
| 19-ago-2026 | Repo público CON workflows | ETL necesita cron, Opción C habría congelado datos |
| 19-ago-2026 | AGPL-3.0 como licencia | Obliga a forks a publicar cambios (protege método) |
| 19-ago-2026 | Archivar repo viejo aunque ETL camara.cl falle | WAF es problema externo, no bloquea launch |
| 19-ago-2026 | Opción A (prioridad técnica) | Sitio impecable antes del launch 1-sep |

## NOTAS TÉCNICAS

- **Bundle warning:** chunk principal de 1115.3 kB (>1 MB): recomendar code-split de gráficos (echarts) en FASE 3
- **WAF camara.cl:** IPs de GitHub bloqueadas, documentado en docs/etl-known-issues.md. Resolver post-launch con proxy vía Cloudflare Workers.
- **Repo de trabajo actual:** C:\Users\jorge\Proyectos\cambiometro
- **Repo privado comercial:** jmorgadodev/cambiometro-editorial (social/, editorial/, estrategia)