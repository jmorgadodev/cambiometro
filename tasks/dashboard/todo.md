# Dashboard parlamentario · fase 7 local

- [x] Registrar rama, SHA base, archivos propios y dependencias en [plan](plan.md).
- [x] Reutilizar Gastos/Personal publicados, comprobar tamaños y huellas contra el release; dietas recuperadas del artefacto público inmutable.
- [x] Implementar /dashboard y acceso secundario desde Cámara sin modificar la landing ni el menú global.
- [x] Filtros por cámara, parlamentario, rango mensual, componente, categoría e ítem; URL compartible, historial y reinicio.
- [x] Evolución mensual, cobertura, desgloses, tabla ordenable/paginada y exportación CSV completa del filtro.
- [x] Proteger meses ausentes, ceros reales, ajustes negativos, filas TOTAL y referencias de dieta con mes oficial.
- [x] Conservar enero/febrero cuando existen; el corte de Partidos sigue desde marzo por defecto.
- [x] Validar contratos, tipos, lint, escritorio/móvil y accesibilidad; cotejar las dos fichas publicadas. Ver [evidencia](evidence.md).
- [ ] Validación de la próxima entrega agrupada contra el release vigente, preview y publicación sólo cuando Jorge lo solicite (fase 9).

Estado: implementación local; no se ha publicado ni modificado ningún ejecutor ETL. Reportajes sigue en fase 8.

## Renovación BI solicitada posteriormente

- [x] Panel lateral plegable, filtros activos y fechas juntas.
- [x] Selección múltiple de partidos/personas, búsqueda y orden por apellidos.
- [x] Componentes mediante botones y tarjetas; comparación por grupo/mes.
- [x] Mostrar 0 en vacíos con su estado, conservando datos originales y CSV distinguible.
- [x] Confirmar 30.397 filas financieras idénticas; 44 pruebas y 19 recorridos de navegador.
- [ ] Publicar sólo con autorización de la siguiente entrega agrupada.

[Verificación y alcance](bi-navigation-evidence.md).
