# Navegación móvil persistente de fichas — 19-11-2026

Base local c3fad28af0b825b10a2389fab75717fd4f0b1f09, origin/main 39cc06d05e110ecd795e56d4d3726ff16f01a13a obtenido. Rama actual codex/dashboard-parlamentario-local-20261119; incremento propio sobre la entrega local anterior, sin publicación.

Problema: el selector de apartados desaparece al leer contenido largo y obliga a volver arriba. Mantenerlo sticky bajo el encabezado, con anterior/siguiente y posición dentro de la ficha. Medir encabezado y barra para reservar el espacio correcto al saltar a un apartado; no usar una altura global supuesta. Conservar hash, historial, foco, estados de paneles y respaldo sin JS.

Archivos propios: AuthorityProfile.tsx y su CSS module; scripts/verify-profile-mobile-navigation.mjs y documentación tasks/fichas. Sin datos, ETL, contratos, navegación/estilos globales o dependencias. Validar Senado/Diputados, móvil estrecho, orientación, escritorio, enlaces directos e historial, teclado y accesibilidad. Se prepara en local y se integra con los avances de fase 7; no publicar.

Resultado: implementado y verificado; ver mobile-navigation-evidence.md.
