# Fase 4 · Votaciones y Partidos, entrega local

Rama codex/votaciones-partidos-local-20261118; base local 5f7d019d86570fe4dca30998c86d72b09622a106, conserva Dietas y Personal. Origin/main 915fe31ecba9a8ceb23a146352ef8bc723f56c7b obtenido al iniciar; raíz canónica cambiometro-public.

Dependencias: sesiones/votos nominales publicados, nómina y militancias con fecha. Archivos propios: resolución de afiliación, cálculo de bancadas, catálogo/detalle de votaciones, adaptación y actualización de tarjetas, guarda editorial y pruebas. Coordinación de consumidores en este mismo incremento local; sin cambios en estilos, menú, hero, calendario o fuentes pausadas.

Aceptación: cada voto utiliza afiliación documentada para su fecha; ausencia de afiliación no equivale a independiente. No calcular muestra con filas nominales ausentes/duplicadas. Mantener resultado oficial, fechas válidas y conteos enteros seguros. La API no rebaja el corte de tarjetas ni duplica IDs/alias. Conservar composición visual y no activar agregados en revisión.

Validación dirigida y componente local aislado; sin suite global, build de Pages, ETL, CI o publicación. Cierre operativo sólo en la futura entrega agrupada.
