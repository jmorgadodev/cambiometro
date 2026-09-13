# Validación del candidato R2-only

**Fecha:** 2026-09-12
**Estado:** validado localmente; pendiente de promoción controlada

## Alcance

Se integraron en un worktree temporal los cambios de reconciliación de fuentes,
frescura de movimientos, paginación R2 y cierre del fallback histórico. El
worktree no pertenece a las tres carpetas operativas y será retirado al cerrar
la validación.

R2 queda como camino público para datos masivos. D1 no participa en búsquedas
públicas ni en la generación de los datos estáticos. No se ejecutó ETL ni se
modificó producción durante esta validación.

## Salvaguarda del repositorio histórico

La búsqueda del candidato no encontró referencias ejecutables a:

- `transparencia.impulsacv.cl`;
- `RELEASE_BASE_URL`;
- `readHotOrArchivedObject`;
- escrituras `bucket.put` desde la lectura pública.

Una partición ausente conserva su estado incompleto y no intenta recuperar
datos desde el repositorio retirado.

## Pruebas ejecutadas

- `npm test`: **175 archivos, 953 pruebas aprobadas**.
- `npm run pages:build`: **4.674 HTML, 4.669 rutas canónicas**.
- `npm run pages:verify`: **346 municipalidades, 205 parlamentarios,
  59.912 transferencias y 18.775 gastos**.
- `npm run verify:static:browser`: **90 comprobaciones aprobadas**, sin
  errores de consola, spinners persistentes ni respuestas inválidas.
- La verificación de movimientos dejó de exigir el marcador histórico `79` y
  calcula el marcador esperado desde el snapshot vigente; en el corte probado
  fueron **81 movimientos del gobierno actual**.

## Resultado y límite

La validación local es consistente y no afecta las rutas existentes. La
producción todavía debe considerarse la referencia vigente hasta ejecutar una
promoción controlada del candidato. No se declara desplegado ni se modifican
los archivos de trabajo del checkout maestro que el usuario mantiene sin
confirmar.
