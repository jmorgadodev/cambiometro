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
workflow_dispatch. La ejecución programada es de revisión: consulta, registra
señales y deja un artefacto; no publica por sí sola. La incorporación pública
de nuevas señales requiere revisión y el flujo de publicación protegido. Este
flujo:

1. Recupera el último snapshot válido desde R2.
2. Consulta en paralelo fuentes primarias (Ley Chile, Diario Oficial,
   Presidencia y ministerios) y feeds de medios con fecha y enlace, incluidos
   Radio Universidad de Chile y Cooperativa. La prensa descubre anuncios, pero
   no acredita por sí sola un cese legal.
3. Registra titulares fechados como señales pendientes, conservando las que
   aún no han sido resueltas y deduplicando por identificador estable.
4. En revisiones posteriores conserva los pendientes y busca menciones
   exactas del nombre en las páginas normativas consultadas. Una coincidencia
   aparece como posible respaldo para revisión humana; no acredita por sí sola
   que el documento sea el acto correcto ni cambia el estado automáticamente.
   La confirmación requiere comprobar manualmente el decreto o resolución y
   su fecha efectiva.
5. Conserva el snapshot anterior si todas las fuentes oficiales están
   bloqueadas; el workflow falla visiblemente y deja un artefacto de diagnóstico.
6. Valida identificadores, fuentes, estados, conteos y checksum.
7. Publica el grupo estático movimientos para que Pages lo consuma sólo cuando
   la ejecución tenga autorización de publicación.

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

La página pública muestra por separado:

- la última ejecución exitosa del proceso;
- el último evento efectivo incorporado al catálogo;
- la fecha de publicación de la evidencia que respalda un evento;
- la última consulta y el estado de cada conector oficial.

Una fuente bloqueada no elimina el snapshot anterior. El proceso conserva los
movimientos con identificadores estables y reconcilia señales nuevas con filas
provisionales existentes en cada ejecución; una señal no se convierte en
movimiento verificado sin decreto o resolución oficial.

## Revisión del 30 de septiembre de 2026

Se añadieron tres novedades como señales separadas del corte histórico de 46
salidas: Sebastián Norambuena (efectiva el 30-09 según comunicado del Minvu),
Kattia Durán (efectiva el 01-10 según información de Radio Universidad de
Chile que cita al ministerio) y Juan Carlos Meléndez (efecto inmediato según
comunicado del Ministerio de Economía, también reportado por El Rancagüino).
Las tres quedan `en_confirmacion` hasta localizar y comprobar el acto
administrativo de cese. No se suman al total histórico de 46. Ante diferencias
entre versiones de prensa y el comunicado institucional, se conserva la
formulación de la fuente primaria y se omiten motivos no confirmados.
