# Módulos y trabajo independiente

El [mapa de páginas y menú](navegacion/README.md) define las seis áreas activas y las trece aplazadas. Consultar también los contratos de [Cámara](camara/README.md), [Partidos](partidos/README.md) y [Metodología](metodologia/README.md). El tablero de esta entrega está en [tasks/navegacion](../../tasks/navegacion/todo.md).

| Módulo | Responsabilidad | Dependencias | Orden |
|---|---|---|---|
| [Gastos](gastos/README.md) | Períodos, categorías e ítems de ambas cámaras | Release estático R2 | 1 |
| [Personal](personal/README.md) | Apoyo y asesorías externas | Nómina parlamentaria | 2 |
| [Dietas](dietas/README.md) | Remuneración bruta oficial | Registro 38 bis | 3 |
| [Votaciones](votaciones/README.md) | Cámara, Senado y bancadas | Nómina e identidades | 4 |
| [Movimientos](movimientos/README.md) | Señales y cambios confirmados | Fuentes y documentos | 5 |
| [Datos](datos/README.md) | Salud, cobertura y metodología | Metadatos de los módulos | 5 |
| [Fichas](fichas/README.md) | Navegación del expediente | Gastos, Personal, Dietas, Votaciones | 6 |
| [Dashboard](dashboard/README.md) | Exploración temporal de costos | Módulos estabilizados | 7 |

Menú activo: Cámara, Partidos, Votaciones, Movimientos, Datos y Metodología. El dashboard tendrá un acceso visible desde Cámara cuando supere su validación. Investigaciones queda para una entrega posterior alimentada por datos estables.

Cada responsable registra tareas/evidencia en tasks/<modulo>. Un módulo se cierra con origen comprobado, ejecución reproducible, artefacto validado, UI coherente y siguiente ejecución comprobada. Los módulos pendientes no se declaran operativos por tener código o un prepare-only correcto.
