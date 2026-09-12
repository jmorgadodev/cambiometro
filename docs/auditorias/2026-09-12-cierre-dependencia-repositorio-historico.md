# Cierre de la dependencia del repositorio histórico

**Fecha:** 2026-09-12
**Estado:** aislado y preparado para promoción controlada

## Resultado

El repositorio inicial `transparencia.impulsacv.cl` dejó de ser una superficie
operativa. Las únicas raíces de trabajo dentro de `C:\Users\jorge\Proyectos`
son:

- `cambiometro-public`: maestro, API pública, Pages, ETL y configuración de datos.
- `cambiometro-audit`: auditoría, evidencia y manifiestos.
- `cambiometro-editorial`: imágenes y borradores para redes sociales.

Los respaldos históricos permanecen fuera de `Proyectos` y no son clones de
trabajo.

## Evidencia operativa

- `transparencia.impulsacv.cl` no resuelve por DNS.
- `https://cambiometro.impulsacv.cl/api/v1/health` responde correctamente.
- La salud productiva observada declara `publicDataBackend: r2`.
- La salud productiva declara `publicD1Reads: false`.
- Transferencias públicas usan `r2`; no se eliminó la D1 compartida porque
  conserva metadatos históricos y operación acotada del maestro.

## Protección incorporada en el maestro

El commit `a7aaa39`:

- elimina el fallback de registros R2 hacia GitHub Releases del repositorio
  retirado;
- elimina la descarga remota de funcionarios desde ese repositorio;
- deja R2 como único plano público de datos masivos;
- conserva la partición como incompleta cuando falta un objeto en R2;
- evita escrituras automáticas durante una lectura pública;
- actualiza identificadores y URL operativas al dominio vigente.

La prueba de regresión verifica que una partición ausente no ejecuta `fetch`
contra una fuente externa. La suite completa pasó con **175 archivos y 952
tests**.

## Estado de promoción

El cambio está en la rama local `codex/r2-public-datasets-d1-closure` y no se
ha desplegado todavía. La promoción debe ejecutarse desde un artefacto limpio,
después de preview y verificación, para no mezclar los cambios de trabajo que
el usuario mantiene sin confirmar en el checkout.

## Preview verificado

Se construyó una copia temporal desde `a7aaa39`, hidratando únicamente los
manifiestos y releases requeridos desde R2. No se ejecutó ETL ni se consultó
D1. El preview fue retirado al terminar.

- `pages:build`: correcto; 4.674 HTML y 4.669 rutas canónicas.
- `pages:verify`: correcto; 346 municipalidades, 205 parlamentarios y
  18.775 gastos en slices verificados.
- `api:size`: correcto; Worker de 170,85 KiB frente al límite de 1 MiB.
- `verify:static:browser`: correcto; 90 comprobaciones, sin errores ni
  respuestas inválidas, con rutas de municipalidades, remuneraciones,
  movimientos, cruces y transferencias funcionando.
- Los artefactos temporales y sus dependencias fueron eliminados.
