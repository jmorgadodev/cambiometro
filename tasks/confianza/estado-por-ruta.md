# Decisión de publicación por ruta

Inventario base revisado el 2026-10-07; estado productivo puntual actualizado
el 2026-10-10. Inventario de los 31 `app/**/page.tsx` existentes,
no de cada registro nacional. Rama, pin y evidencia en [README](README.md) y
fórmulas/limitaciones en [matriz](matriz.md). «Conservar» no significa aprobar
todos sus indicadores; ninguna ruta obtiene certificación universal.

| Ruta | Decisión aplicada o propuesta | Comprobación que falta |
| --- | --- | --- |
| `/` | Conservar diseño y catálogo; aviso de alcance | Smoke productivo 10-10: 51 movimientos (46 filas oficiales + 5 señales), cambio efectivo 14-09 y revisión 01-10; 1.037 votaciones, última incorporada 07-10. La conciliación de todos los contadores sigue pendiente. |
| `/movimientos` | Contar 51 anuncios/eventos; separar confirmación documental; seis fechas cuestionadas En revisión; preview, render y producción comprobados ([acta](movimientos-documentos-20261007.md), [evidencia productiva](README.md)) | Obtener actos faltantes y conciliar metadatos sin alterar originales; el smoke confirma publicación, no verificación legal de todos los casos |
| `/cambios` | Mantener con alcance de Movimientos | Mismo control documental; no sumar casos dos veces |
| `/votaciones-destacadas` | Mantener totales de sesión declarados; retirar nominales discordantes; corte productivo observado: 1.037 votaciones, última incorporada 07-10 | Padrón/actas originales, particularmente Senado; el corte observado no certifica que existan todas las sesiones recientes en origen |
| `/politico` | Mantener directorio y períodos; sin dieta constante ficticia | Identidad, vigencia y conciliación de costos por mes |
| `/politico/[id]` | Mantener evidencia individual; asistencia/cohesión y nominales cuestionados En revisión | Actas, afiliación temporal y documentos nominales |
| `/partidos` | Mantener catálogo; retirar comparaciones agregadas | Receta reproducible y pertenencia temporal |
| `/partidos/[sigla]` | Enlaces individuales; indicadores agregados En revisión | Igual que catálogo; no usar partido actual para votos históricos |
| `/gastos-operacionales` | Mantener registros; agregado no conciliado y promesa de universo completo retirados en preview `5df196d2` ([acta](gastos-presentacion-20261007.md)) | Conciliar ítems/montos y meses declarados consultables; producción aún sin promover |
| `/remuneraciones-publicas` | Mantener registros por fuente/organismo/período | Muestreo y conciliación de cortes; no suponer mensualidad completa |
| `/funcionarios` | Mantener nóminas con alcance y originales | Identidades y unidades; filas no son personas únicas |
| `/personas` | Mantener evidencia por fuente sin fusionar homónimos | Identificadores suficientes para cada vínculo |
| `/autoridades` | Mantener catálogo, sin inferir vigencia desde un pago | Nombramiento/mandato individualizado |
| `/municipalidades` | Mantener fichas y alcance territorial declarado | Auditoría por indicador; muestra no certifica 346 nóminas |
| `/municipalidades/[id]` | Titular y pago histórico separados | Período/contrato de cada monto y fuente original |
| `/servicios-publicos` | Mantener catálogo institucional | Conciliar unidades, años y cortes |
| `/servicios-publicos/[id]` | Conservar evidencia agregada del organismo | No atribuir presupuesto/ejecución como pago personal |
| `/transferencias` | Mantener corte integrado de Ley 19.862 | Universo/meses reconciliados antes de total anual |
| `/entidades` | Conservar catálogo con alcance de cada fuente | Relaciones documentadas; no causalidad por coincidencia |
| `/entidades/[id]` | Mantener documentos y enlaces de origen | RUT/identificador por vínculo; ChileCompra sin nuevas cargas |
| `/cruces` | Mantener exploración con advertencia concreta | Identidades/alcance de cada relación; no inferir influencia |
| `/rankings` | Estado En revisión cuando faltan registros | Elección, denominador y comparabilidad |
| `/comparar` | Conservar ruta; comparación limitada a unidad/período | Validar cada fórmula y no completar nulos |
| `/calculadora` | Escenarios explícitos, no gasto ejecutado | Supuestos individualizados y componentes no inferidos |
| `/datos` | Retirar total entre categorías y promesas universales; ajuste responsivo validado en preview | Conciliación entre unidades; el render no certifica cada contador |
| `/datos/calidad` | Conservar diagnóstico con aviso heredado | Calidad técnica no certifica verdad de todos los registros |
| `/fuentes` | Mantener períodos/unidades por conjunto | Contraste de cada resumen contra el release construido |
| `/buscar` | Mantener búsqueda del universo integrado | API, paginación e identidad; smoke sin API no las certifica |
| `/como-funciona` | Definir estados y límites; fuente oficial ≠ conjunto completo | Coherencia continua con cada indicador y exportación |
| `/donar` | Conservar página institucional; no prueba elegibilidad | Aprobación humana de misión/gobernanza propuesta |
| `/privacidad` | Conservar política y contacto | Adopción institucional y prueba del canal con consentimiento |

Todas las familias de datos reciben aviso SSR; `/donar` y `/privacidad` son
páginas institucionales, no conjuntos certificados. Las rutas dinámicas heredan
el aviso de su familia; no se enumeraron ni descargaron todas sus fichas.

## Separación de evidencia

- Pruebas unitarias: comprueban comportamiento, no la verdad de una nómina.
- Diagnóstico aritmético: identifica diferencias de proyección, no prueba
  por sí mismo un error del ETL o una irregularidad.
- Navegador sin API: comprueba presentación con fuentes indisponibles; no
  certifica búsquedas o API productivas.
- Documento de origen: exige enlace exacto, período y contenido contrastado.
- Institucional: borrador no es adopción, reunión realizada ni elegibilidad.

No reactivar un indicador retirado sólo porque exista un aviso. No considerar
cerrada la revisión de las columnas pendientes hasta registrar su evidencia.
