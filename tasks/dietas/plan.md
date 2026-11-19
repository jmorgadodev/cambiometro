# Fase 3 · Dietas, entrega local

Rama codex/dietas-estabilizacion-local-20261118; base local 215a872fe9e9424e983414a7de38bb0cbf68f7e0, conserva la fase de Personal. Origin/main 915fe31ecba9a8ceb23a146352ef8bc723f56c7b obtenido al iniciar. Raíz canónica cambiometro-public.

Dependencia: registro 38 bis, snapshot e histórico íntegros. Archivos propios: proyección parlamentaria, parser/validador, salida compatible del ETL y pruebas dirigidas. No modificar menú, landing, fichas, contratos Next, calendario ni publicación.

Criterio indicado por Jorge: la dieta no cae a cero por faltar en la fuente. Se conserva la última dieta oficial como referencia, con su mes. Un ajuste requiere respaldo oficial; no se imputa el importe a otro período ni se generaliza un monto a personas sin identidad comprobada.

Aceptación local: usar la observación válida más reciente por persona, incluidos meses parciales intermedios; preservar importes positivos ante null/0 y ante correcciones del mismo período; respetar identidad/cámara; excluir cargos administrativos; CLP entero seguro y períodos válidos; mismo tratamiento en ETL e hidratación. Pruebas, lint y tipos locales; publicación agrupada sólo cuando la solicite Jorge.
