# 📂 Carpeta Aislada: Auditoría de Integridad de Datos y Catálogo de ETLs

Esta carpeta contiene la documentación técnica, inventarios y reportes de auditoría de los datos públicos procesados por la plataforma **El Cambiómetro** (`transparencia.impulsacv.cl`).

---

## 📑 Contenido de la Carpeta

1. [**inventario_completo_etls.csv**](./inventario_completo_etls.csv):
   * Archivo CSV con el catálogo tabular completo de cada pipeline ETL: nombre de la fuente oficial, tipo de conexión, cantidad exacta de registros, periodo de cobertura, claves primarias, campos extraídos y estado de validación.

2. [**docs/arquitectura-datos.md**](../docs/arquitectura-datos.md):
   * Diagrama Mermaid de flujo de datos desde los portales de origen del Estado hasta las proyecciones y vistas web.
   * Documentación detallada de cada una de las 10 canalizaciones de datos, secciones de integridad y append-only.

3. [**AUDITORIA_INTEGRIDAD_EXHAUSTIVA.md**](./AUDITORIA_INTEGRIDAD_EXHAUSTIVA.md):
   * Informe de auditoría sobre la calidad e integridad de los datos (+1.650.000 registros).
   * Certificación de resolución de anomalías (corrección de sueldos de alcaldes, cobertura del 100% de comunas en el Censo 2024 y consolidación de dotaciones).

4. [**audit-runner.mjs**](./audit-runner.mjs):
   * Script automatizado en Node.js que recorre y valida físicamente los archivos del data lake y proyecciones.

---

## 🚀 Cómo Ejecutar la Auditoría Automatizada

Para volver a comprobar la integridad de todos los datos en cualquier momento:

```bash
node auditoria_integridad_datos/audit-runner.mjs
```