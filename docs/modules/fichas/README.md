# Ficha parlamentaria

## Contrato y responsabilidad

Resumen predeterminado, menú izquierdo, un apartado visible a la vez y selector móvil. Conservar fuentes y todos los períodos publicados. Agrupar antecedentes secundarios para no saturar el resumen.

## Origen, ejecución y artefactos

Ejecutores: Consume módulos existentes; no incorpora un ETL propio.

Artefactos: app/politico/[id], componentes politico y slices.

El calendario remoto canónico es .github/etl-calendar.json. Las rutas locales son relativas a cambiometro-public/transparencia-app; no instalar tareas desde worktrees. Verificar el corte del manifiesto publicado antes de usar copias locales.

## Verificación y recuperación

Desde transparencia-app: Comparar Bianchi y Kaiser contra el mismo release productivo; validar teclado, móvil y hashes de datos.

Si el origen falla o se reduce la cobertura sin justificación, detener la publicación y conservar el último release válido. Registrar fallo, período, checksum y próxima acción en tasks/fichas/evidence.md. No reactivar módulos secundarios como dependencia incidental. La recuperación de interfaz usa el artefacto previo; la de datos usa el release previamente validado.

## Archivos compartidos

Cualquier cambio de esquema, generador de slices, navegación global o release-set debe coordinarse con el integrador y sus consumidores. Consultar AGENTS.md antes de editar.

## Incremento local del 19-11-2026

Ver [evidencia](../../../tasks/fichas/evidence.md) y [plan](../../../tasks/fichas/plan.md). Navegación por paneles, hashes previos y estado mensual preservados. Preparado en local, pendiente de entrega agrupada.

## Renovación local — 19-11-2026

Antecedentes de identidad bajo nombre y partido: profesión/formación declarada, edad derivada, región, período y contacto/redes incorporados. La declaración tiene prioridad sobre la profesión biográfica; los campos sin respaldo no se inventan y se distingue procedencia. Antecedentes conserva timeline, militancias y declaración; Lobby y biografía duplicada dejan de ocupar ese panel. Gastos, dietas, apoyo y sus períodos se conservan. Children.toArray normaliza las claves de los bloques RSC sin desmontar paneles por cambiar el apartado.

Ver tasks/votaciones/explorador-editorial-evidence.md para alcance y pruebas. No publicado.
