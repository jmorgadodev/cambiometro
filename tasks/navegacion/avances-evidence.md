# Apartados en desarrollo: contenido recuperado

19-11-2026. Rama codex/navegacion-votaciones-local-20261119; hereda la ficha local fff8d662. Se corrigieron los trece layouts que descartaban children y sustituían el contenido por una espera. Ahora muestran aviso SSR sobre la página original. Se preservan URL, subrutas, navegación, metadatos de cada página y noindex del alcance aplazado. La nota permite explorar avances e informa el corte/limitaciones. No se reactivan ETL ni se modifican datos o APIs.

Pruebas: cada layout se renderiza con un contenido testigo, confirma aviso y conservación del cuerpo. Header mantiene seis áreas principales y trece secundarias. Se actualizó la expectativa E2E anterior que buscaba una pantalla vacía. Pruebas de navegación/consumidores, lint y tipos correctos; build y E2E completos quedan para entrega agrupada. Los contenidos específicos siguen sujetos a su propia cobertura: esta corrección no los declara completos ni actualizados.

Preparado en local; producción mantiene la versión anterior hasta que Jorge solicite publicar. Recuperación: revertir el incremento de layouts sin tocar datos históricos.
