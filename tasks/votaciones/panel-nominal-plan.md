# Detalle lateral y nóminas — 19-11-2026

Rama codex/votaciones-panel-nominal-20261119, base dfb9eb68; origin/main 915fe31e actualizado. Única raíz web canónica.

Alcance: lib/voting-explorer y pruebas; componentes/votaciones/VotingExplorer y CSS local; Metodología y documentación del módulo. Sin cambios de contratos API, ETL, navegación o estilos globales.

Aceptación: panel desde la derecha de altura completa; cierre por botón, Escape y fondo; foco restaurado; desplazamiento del fondo bloqueado. Ambas cámaras muestran nombres y opciones publicadas cuando la nómina tiene identidades únicas, opciones reconocidas y concilia los tres totales oficiales. Sin nómina o con inconsistencia se explica la cobertura, sin inventar ausencias. Búsqueda y filtros nominales. Validación dirigida, lint, tipos, compilación y navegador real en escritorio/móvil.

Evidencia de origen: Cámara 91584 contiene 155 nombres: 89 Afirmativo, 36 En Contra, 10 Abstención y 20 No Vota. El XML retornarVotacionDetalle coincide con el registro publicado, pero contiene 21 nombres duplicados con diferentes IDs. La página oficial publica otra nómina. El método antiguo retorna nil y el HTML devuelve 403 al descargador local. No se sostiene habilitar Cámara por mera coincidencia de totales; se mantiene validación por registro y queda pendiente reconciliar su fuente nominal. Capturas de origen en transparencia-app/artifacts/voting-panel, ignoradas por Git.

Entrega local agrupada; publicación pendiente de artefacto UI-only con R2 y release-set vigente.

## Estado de aceptación

- [x] Panel derecho, móvil, búsqueda/filtros y accesibilidad.
- [x] Regla nominal común y regresiones de inconsistencias.
- [x] Navegador real: Senado nominal y Cámara en revisión; rama nominal de Cámara con fixture explícita.
- [ ] Recuperar y conciliar el nominal real de Cámara desde una fuente descargable; 91584 permanece en revisión.
- [ ] Publicar una entrega agrupada con datos verificados de ambas cámaras.

Ver panel-nominal-evidence.md para hallazgo, límites y recuperación.
