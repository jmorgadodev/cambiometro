# Landing · métrica parlamentaria

Base: main 4111ea26, rama codex/landing-metrica-registros-20261118. Corrección solicitada tras publicar la navegación.

El total entre fuentes permanece no conciliado. La tarjeta inicial pasa a contar fichas parlamentarias desde `POLITICOS_SEED.length`, la misma nómina usada por el directorio: 205 en la entrega actual. Se etiqueta «Fichas parlamentarias · Cámara y Senado · nómina publicada», sin presentarlo como total de registros ni personas del Estado. La franja conserva composición, estilos y los otros cuatro indicadores.

En SourcesCatalog se omite únicamente el total global desconocido; se conservan fuentes, conteos por capítulo y cifras por fuente. Un total conocido de cero sigue mostrándose. No se cambia el contrato ni la conciliación de los datos y no se ejecutan ETL.

Archivos propios: app/page.tsx, components/home/MetricsBar.tsx, components/home/SourcesCatalog.tsx y sus pruebas. Dependencia: navegación #842 integrada. Aceptación: ninguna aparición de «No calculable» en la landing, primera tarjeta numérica coherente con el directorio, mismo diseño y release de datos.

Verificación: pruebas SSR para contador y total ausente/cero/informado; lint y tipos; build con R2, preview escritorio/móvil y promoción del artefacto verificado. El resto de módulos y las fichas se conserva.
