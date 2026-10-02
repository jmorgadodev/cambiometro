# Recuperación con releases y respaldo existente — 2026-10-02

Ruta: `C:\Users\jorge\.codex\worktrees\codex-stabilizacion-20261001`. Rama: `codex/rollback-evidence-20261002`.

## Evidencia acotada

`cambiometro-backups` contiene 4.108 objetos, 1.049.483.183 bytes. El manifiesto `compact/v1/manifest.json` ocupa 4.753.537 bytes y declara 4.940 referencias a 4.107 blobs únicos (`gzip-sha256-v1`).

La muestra anterior elegía los seis blobs más pequeños: apenas 91 bytes restaurados. El verificador ahora distribuye seis muestras entre los tamaños disponibles, excluye archivos triviales y limita cada archivo a 2 MiB comprimidos y 16 MiB restaurados. Detiene la descompresión si supera el tamaño declarado.

Prueba real: seis muestras, 1.645.633 bytes comprimidos, 22.345.237 bytes restaurados; todos los SHA-256 y tamaños coincidieron. Siete GET de datos (manifiesto más seis blobs), además de autenticación/metadatos; cero PUT/DELETE y ninguna copia nueva. Duración inferior a un minuto. No acredita todos los blobs del respaldo.

El simulacro verificó los contratos y los bytes/tamaños SHA-256 de dos archivos de Movimientos en deployments existentes. Cambió un puntero sólo en memoria al release anterior y lo devolvió al vigente:

- Vigente de la prueba: `1c9dc4bec22b4a096a29a76452dc8f8ad4debee12b8b6a5b2a9ea288c11bb8cf`, `https://b3dbf875.cambiometro.pages.dev`.
- Anterior: `95785d19c8b77178004618d4027b4fd8f3343fa372ed3e2fc3fe644bd0c9fd5c`, `https://dc92888a.cambiometro.pages.dev`.
- Resultado: regreso al mismo release vigente, cero escrituras remotas. No prueba CAS remoto ni rollback productivo; O08 sigue abierto.

## Reproducción y recuperación

Desde `transparencia-app`, con las credenciales R2 configuradas:

```powershell
node scripts/r2-compact-backups.mjs --mode=verify-remote
npx vitest run lib/r2-compaction.test.ts scripts/etl/connectors/release-set.test.mjs
```

Estos comandos sólo leen o ejecutan pruebas. No ejecutar `archive`/`apply` para esta comprobación. Las once pruebas cubren límites de muestra, identidades protegidas, corrupción de artefactos y promoción desde una base atrasada.

Para repetir el simulacro: obtener `/data/release-set.json` de ambos deployments anteriores, validar ambos contratos con `assertReleaseSetPromotion` y comprobar SHA-256/tamaño de `data/movimientos.json` en cada deployment. Asignar un puntero en memoria vigente → anterior → vigente, pasando el ID actual como `expectedCurrentId` en cada transición.

Ante un incidente productivo:

1. Identificar la fuente afectada y sus releases/fechas/checksums; un deployment anterior puede contener otras fuentes más antiguas.
2. Comprobar disponibilidad y bytes de los objetos elegidos antes de restaurar.
3. Preferir reconstruir con los releases correctos por fuente. Ante una regresión exclusivamente de interfaz, usar `npm run pages:rollback -- <deployment-id>` con el deployment validado y credenciales Pages.
4. Comprobar fuente, Home y búsqueda y registrar deployment, checksums y resultado.

El token local usado aquí no puede listar deployments Pages; se verificaron sus URLs públicas. No cambiar retención, borrar objetos ni generar copias. O14 cierra el ensayo acotado y su procedimiento; O08 y la observación de siete días mantienen sus propias puertas.
