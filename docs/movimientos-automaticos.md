# Movimientos de autoridades: operación y criterio editorial

## Qué se publica

El apartado /movimientos/ conserva el historial acumulado y separa dos estados:

- verificado: existe un decreto o acto normativo comprobable en Ley Chile o
  Diario Oficial.
- en_confirmacion: existe un anuncio oficial o evidencia periodística
  concordante, pero todavía no se ha encontrado el acto normativo que permite
  cerrar el registro.

Una noticia oficial confirma que el cambio fue anunciado; no sustituye por sí
sola el decreto. Los registros en confirmación se muestran explícitamente y no
se promueven automáticamente a verificados.

## Ejecución automática

El workflow .github/workflows/etl-movimientos.yml se ejecuta diariamente a las
07:00 UTC (03:00 en Chile durante el horario de invierno) y también admite
workflow_dispatch. Este flujo:

1. Recupera el último snapshot válido desde R2.
2. Consulta en paralelo Ley Chile, Diario Oficial, Gob.cl, Prensa Presidencia
   y Ministerio del Deporte.
3. Detecta señales, las deduplica y materializa sólo las señales con identidad
   estable conocida.
4. Conserva el snapshot anterior si todas las fuentes oficiales están
   bloqueadas; el workflow falla visiblemente y deja un artefacto de diagnóstico.
5. Valida identificadores, fuentes, estados, conteos y checksum.
6. Publica el grupo estático movimientos para que Pages lo consuma en el
   siguiente refresco.

El flujo de Movimientos es independiente del ETL de Cámara. Un bloqueo de
Cámara no debe impedir esta actualización.

## Evento incorporado el 27 de agosto de 2026

El registro estable mov-rios-deportes-2026-08-27 documenta:

- cargo: Subsecretaria de Deportes;
- saliente: Andrés Otero Klein, con renuncia informada el 13 de agosto;
- entrante: María Paz Ríos Lama, con asunción el 27 de agosto;
- anuncio: 26 de agosto de 2026;
- estado: en_confirmacion, hasta localizar el decreto normativo.

La procedencia queda almacenada en el snapshot, incluyendo el comunicado de
[Prensa Presidencia](https://prensa.presidencia.cl/comunicado.aspx?id=339274),
BioBioChile, Cooperativa, Pauta, CNN Chile y 24 Horas.

El registro anterior de Sofía Rengifo se corrigió a nombramiento-fallido y
en_confirmacion: el enlace normativo que tenía asociado no acreditaba ese
nombramiento. No se eliminó el antecedente periodístico; se retiró la
clasificación oficial incorrecta.

## Metadatos para auditoría

data/movimientos.json incluye last_attempt_at, last_success_at,
last_event_date, source_health, checksum_sha256, stats y signals. La fecha del
último evento no debe confundirse con la fecha de la última publicación exitosa.
