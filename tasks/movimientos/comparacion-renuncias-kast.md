# Comparación de Movimientos: Renuncias Kast

Consulta: 18-11-2026 America/Santiago (2026-11-19T02:16:30.272Z). Base local 9c851725e076d91b38503c648ec41a65e0062c4d, rama codex/movimientos-conteo-local-20261118. Origin/main obtenido antes de editar. Sin push, CI, ETL remoto ni publicación.

## Diagnóstico confirmado

El dominio es https://renunciaskast.cl/ (con s). Declara 59 casos al 30-10-2026: renuncias, ceses, cambios de puesto y nombramientos fallidos. Sus datos inline se leyeron como AST y sólo se aceptaron valores literales; no se ejecutó JavaScript externo. Se conservó HTML para comparar, sin usarlo como fuente automática de nuestro ETL.

Los datos servidos por https://cambiometro.impulsacv.cl/data/movimientos.json tienen 46 movimientos y 16 señales: 62 registros. SHA256 cb43dc1eee263d790577a377cb622913b1ebc388a9f9d30864c4755790206a17, coincide con la entrada del release-set público consultado en la misma revisión. No se usó la fixture Git para afirmar cantidades productivas.

| Diferencia | Efecto |
|---|---|
| Consejo de Mañalich para que Rabat evalúe salir | Opinión, no anuncio de renuncia |
| Frase contrafactual de Elizalde sobre lo que haría en lugar de Rabat | Hipótesis, no salida |
| Cuestionamiento del PDG a la designación de Steinert | Reacción política, no nuevo movimiento |
| Nombramiento entrante de Josefina Soto | Se conserva en Movimientos; no se suma como otra salida |

62 menos esas 4 entradas deja 58 casos comparables, no 59 salidas confirmadas. Hay 58 coincidencias nominales en la comparación y un caso de la referencia sin correspondencia: Cristián Bravo. Las coincidencias nominales no certifican igualdad de fecha efectiva, cargo o nivel de evidencia; no se fuerzan los totales para igualarlos.

## Cristián Bravo: diferencia documentada, no incorporación automática

La revisión previa docs/operations/movimientos-announcements-20261001.md ya documentaba el anuncio inicial y la existencia de un sucesor, sin una noticia independiente que afirmara la salida o nombramiento fallido. Se volvió a consultar la fuente enlazada por la referencia: https://www.soychile.cl/antofagasta/sociedad/2026/04/20/947684/nuevo-seremi-antofagasta.html. Describe la asunción de Juan Emilio Fernández; por sí sola no establece el cese de Bravo ni su fecha efectiva. No se infiere una renuncia a partir de un sucesor. Sigue pendiente evidencia explícita para incorporar ese caso con su estado y fecha correctos.

## Corrección local

- Política de opiniones/hipótesis compartida por interfaz y ETL. Se aplica tanto a nuevas noticias como al replay de señales anteriores. Las tres observaciones conservan su trazabilidad en signal_observations; no se borran los 46 movimientos publicados.
- El contador principal de /movimientos muestra casos de salida y nombramientos fallidos, incluidos pendientes; un nombramiento entrante permanece en el listado separado. Sobre el corte productivo capturado: 58 casos = 45 con respaldo + 13 pendientes. No son 58 renuncias confirmadas.
- La portada omite las tres opiniones y conserva el tipo de cada anuncio: un nombramiento no recibe la etiqueta RENUNCIA.
- No se modifica el snapshot versionado ni datos remotos. La corrección productiva de señales y la UI se incorporarán en la entrega agrupada solicitada por Jorge.

## Validación

Las tres regresiones fallaron antes de corregir. Después: 122 pruebas en 9 archivos del módulo y Home; lint y tipos correctos (se corrigió un campo summary ausente en la fixture nueva de prueba). Navegador con la página Movimientos real y el JSON productivo capturado: escritorio 1280 y móvil 390; contador 58 y desglose 45/13, opiniones ausentes y sin errores ni desbordamiento horizontal. Next Link/navigation se sustituyen en esta prueba aislada; CSS existente sin directivas Tailwind. No es un build completo de Next.

Replay offline del corte capturado: 46 movimientos conservados, 13 señales (antes 16), las tres opiniones quedan observadas y la protección de historia pasa. Recibos/capturas/scripts en transparencia-app/artifacts/movimientos-comparacion/, ignorados por Git. Servidor y navegador cerrados al terminar.

## Pendientes

- [ ] Obtener evidencia explícita sobre Cristián Bravo; no sumar por inferencia.
- [ ] Reconciliar fechas/cargos y evidencia por identidad; el comparador nominal no las valida.
- [ ] Integrar y publicar código/UI y candidato de datos validado en la entrega agrupada. La producción todavía conserva el comportamiento anterior.
