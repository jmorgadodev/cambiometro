# Diagnóstico de Movimientos: producción, local y frescura

**Fecha del diagnóstico:** 2026-09-12  
**Alcance:** sólo lectura; no se ejecutó ETL ni se modificó producción.

## Estado productivo

El snapshot público `https://cambiometro.impulsacv.cl/data/movimientos.json`
declara:

| Campo | Valor |
|---|---|
| Pipeline | `etl_movimientos_autoridades` |
| Último intento exitoso | 2026-09-12 11:24:46 |
| Último evento efectivo | 2026-09-02 |
| Movimientos conservados | 82 |
| Verificados | 74 |
| En confirmación | 8 |
| Señales observadas | 11 |
| Últimos 7 días | 0 |
| Checksum | `2043e859b65d134aac1332ae60492eeda040fff1634e33c06373d6e51ac9dd86` |

La ejecución programada más reciente fue el run `34690963760`, con resultado
exitoso. El workflow diario continúa activo y no depende de una ejecución local
para publicar el snapshot.

## Comparación con local

El artefacto local conserva también 82 movimientos, con 74 verificados y 8 en
confirmación. Su última ejecución es del 2026-09-10 11:59:19 y su último evento
efectivo también es del 2026-09-02.

La diferencia de checksum no implica por sí sola una alteración de movimientos:
producción tiene dos señales adicionales que no estaban en el snapshot local.
Ambas fueron detectadas por fuentes provisionales el 12 de septiembre. No hay
movimientos presentes sólo en producción o sólo en local; la diferencia está en
señales y metadatos de ejecución.

## Estado de fuentes

Las fuentes oficiales Ley Chile, Diario Oficial, Prensa Presidencia y Ministerio
del Deporte respondieron correctamente en la última ejecución. `gob.cl` respondió
HTTP 403; se mantiene como advertencia no bloqueante y no se usa como única
evidencia para promover un movimiento.

Las señales de prensa permanecen separadas de los movimientos verificados. Los
casos recientes de Alonso Velásquez y Patricio Löhr siguen correctamente en
estado `en_confirmacion`, con sus fechas efectivas y fuentes asociadas.

## Conclusión de fase

La actualización productiva funciona y el universo histórico no se redujo. El
desfase local/producción corresponde a frescura: producción es dos días más
nueva y debe ser la referencia operativa.

Queda pendiente, para una fase posterior y sin urgencia de despliegue:

- incorporar explícitamente en la interfaz la fecha del último evento y la fecha
  de la última ejecución;
- mantener visible el desfase cuando no existan eventos nuevos;
- decidir si se reemplaza o complementa el conector 403 de `gob.cl`;
- evaluar actualización incremental de señales sin promover noticias a eventos
  oficiales.

