# Geometría territorial para el mapa municipal

`chile-regiones.geo.json` contiene únicamente la geometría simplificada de las 16 regiones de Chile para visualización en `/municipalidades`.

- No contiene indicadores, conteos ni registros estadísticos.
- No forma parte de ningún ETL.
- Los valores del mapa provienen exclusivamente de `data/municipalidades-list.json` y de los agregados ya publicados.
- La geometría fue simplificada para navegador y no debe usarse para mediciones territoriales.
- Procedencia cartográfica: [Chile GeoJSON](https://github.com/sebaebc/chl-geojson), con capas derivadas de la división político-administrativa publicada por IDE Chile.
- Referencia oficial de la división político-administrativa: [Datos.gob.cl — DPA 2023](https://datos.gob.cl/dataset/categoria-geoespacial-limites-y-fronteras/resource/0cc095c1-80f0-4d31-9aad-4dcffce3d957).

La simplificación reduce la precisión geométrica, pero conserva la función de selección regional y no modifica los datos publicados por El Cambiómetro.
