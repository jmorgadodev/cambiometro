# Explorador parlamentario y ficha — 19-11-2026

Base e568bacb, origin/main 915fe31e obtenido antes de editar. Rama codex/votaciones-explorador-fichas-20261119. Entrega local; preview 40c43f70 permanece fija.

1. Adaptar lectura de la herramienta editorial social/Publicaciones/Votaciones: proyectos expandibles, materias, resultado, contadores y detalle dentro del sitio. Cubrir todos los registros incorporados de 2026, sin limitar por mes ni convertir falta de meses/nominales en cero. Legisladores abre historial de votos aquí; sesiones abre decisiones aquí. Retirar Asistencia del menú.
2. Cabecera de ficha: antecedentes debajo de nombre/partido, profesión declarada, edad, territorio, período y redes con procedencia. Antecedentes conserva timeline, militancias y declaración. Mantener períodos/importes financieros.
3. Centralizar accesos a portales oficiales en Fuentes y alcances; conservar las URL de evidencia y redes personales verificadas.
4. Datos pasa a En construcción conservando contenido; Metodología describe el alcance vigente con cifras derivadas del mismo release. Pie: Creado por Jorge Morgado enlazado a jmorgado.pages.dev; retirar ImpulsaCV.

Archivos compartidos: lib/site-modules, config/construction-modules, fuentes, metodología, footer, contratos de Votaciones y componentes de ficha. Sin cambios de cron, manifests ni escrituras remotas. RRSS se inspecciona en lectura; no se copia su servidor ni sus operaciones editoriales. Verificación: pruebas de contratos/selección/cobertura, tipos/lint, navegador de escritorio/móvil con datos publicados capturados y checksum verificado. Build integrado sólo al cerrar entrega agrupada.
