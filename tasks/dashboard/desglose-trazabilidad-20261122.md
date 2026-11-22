# Desglose completo y trazabilidad — 22-11-2026

Raíz canónica cambiometro-public, rama codex/dashboard-explorador-20261121; base ab6ab9a5, origin/main 0cae8e73 obtenido. Sólo local. No ETL, conexiones, almacenamiento, workflows, push ni despliegue.

1. Contrato: preservar prestador (Asesor), folio, campos originales, concepto/descripción cuando existan. Separar al parlamentario informante; sin inferir prestador desde Diputado. Fuente actual: 378 asesorías con Asesor/Folio/Monto/Diputado/Reserva/Doc/Formulario/Declaración; ninguna con sourceLinks o descripción de servicio. Gastos sólo contienen ítem/monto/período/identidad/URL. No prometer recibos desglosados inexistentes.
2. Proyección: enriquecer detalles sin modificar hechos/montos/agrupaciones ni suprimir observaciones. Reutilizar particiones, checksums y carga diferida.
3. Panel: total, agrupación opcional y lista completa; búsqueda, filtros, orden monetario descendente, paginación, subtotal de resultados por componente, CSV y fuente. No sumar componentes solapados. Aplicar a personas, categorías, ítems y componentes.
4. Registros globales: mostrar/buscar/exportar prestador y conceptos originales; sin confundir integrante o prestador con parlamentario.
5. Aceptación: conciliación exacta contra fuentes por mes/cámara/persona/categoría/ítem, integridad de sin asociación, todas las páginas/CSV, error/reintento, desktop/móvil, filtros/enlaces existentes, captura de gastos y asesorías.

Archivos propios: lib/parliamentary-explorer{,-build}.ts, nuevos helpers/pruebas de registros, components/dashboard/explorer/ExplorerDetail.tsx, ExplorerRecords.tsx y navegador de registros con CSS local. Contrato compartido coordinado aquí con adaptadores/UI/CSV/pruebas. No modificar navegación global ni módulos ajenos.

## Cierre local

Implementación `703984ad`; 338 archivos / 2.174 pruebas, 684 selecciones conciliadas y 70 comprobaciones de navegador aprobadas. Fuentes temporales restauradas con checksums. [Entrega y límites](entrega-desglose-trazabilidad-20261122.md), [recibo](desglose-trazabilidad-validacion-20261122.json). Sin publicación.
