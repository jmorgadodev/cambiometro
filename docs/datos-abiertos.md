# Diccionario de Datos Públicos y Limitaciones Conocidas

Este documento consolida las fuentes oficiales, criterios metodológicos, reglas de integridad y limitaciones conocidas del ecosistema de datos abiertos de **El Cambiómetro**.

---

## 1. Cobertura Comunal y SINIM (Caso Comuna Antártica)

- **Total de Comunas:** 346 comunas según división político-administrativa oficial de Chile (Censo 2024 / SUBDERE).
- **Total de Municipalidades:** 345 municipalidades administradoras.
- **Caso Comuna de Antártica (Código 12202):** La comuna de Antártica no posee una municipalidad propia ni estructura financiera separada; es administrada por la **Municipalidad de Cabo de Hornos** (Código 12201). En consecuencia, los balances presupuestarios SINIM consolidan 345 entidades edilicias. En El Cambiómetro, la ficha comunal refleja esta condición administrativa sin alterar los indicadores per cápita comunales.

---

## 2. Bloqueo Perimetral WAF en Fuentes del Congreso (`camara.cl`)

- **Origen:** El portal oficial de la Cámara de Diputadas y Diputados (`camara.cl`) implementa un Web Application Firewall (WAF) que bloquea rangos de direcciones IP pertenecientes a centros de datos y runners de integración continua (GitHub Actions).
- **Tratamiento Metodológico:** 
  - Las extracciones de nóminas de personal de apoyo y rendiciones de la Cámara se ejecutan mediante ingestión controlada desde entornos residenciales autorizados (`scripts/etl-personal-apoyo.mjs`).
  - Los datos generados se empaquetan en snapshots inmutables con checksum SHA-256 (`data/personal-apoyo.json`) y se publican en particiones versionadas del data lake antes de su materialización en D1.

---

## 3. Desglose de Gastos y Cobertura de Períodos en el Senado

- **Transparencia Activa del Senado (`web-back.senado.cl`):**
  - Los gastos operacionales y dietas parlamentarias se ingieren directamente desde la API oficial de Transparencia Activa del Senado.
  - **Diferencias de Desglose vs Totales:** En períodos donde la fuente oficial publica totales sin desglose o con discrepancias respecto a la suma de ítems componentes, El Cambiómetro prioriza la **suma exacta de ítems verificables** y genera automáticamente un aviso de auditoría metodológica visible en la ficha.
  - **Disponibilidad de Meses:** La cobertura de meses en la plataforma refleja estrictamente los períodos que el Senado ha publicado oficialmente (por ejemplo, períodos 2026-03 a 2026-05 para gastos operacionales, y hasta 2026-07 para dietas y personal de apoyo). Las ausencias de meses aún no publicados se tratan como falta de publicación oficial y no como datos en cero.

---

## 4. Cruces de Datos con RUT Jurídico Verificado y Trazabilidad Estricta

- **Regla de Integridad de Entidades:** Todo cruce documental entre compras públicas (MercadoPúblico/ChileCompra), audiencias de lobby (InfoLobby/CPLT), declaraciones patrimoniales (InfoProbidad) y auditorías (Contraloría General de la República) requiere identificación unívoca.
- **Validación de Identificadores:**
  - Los RUTs de personas jurídicas y proveedores se normalizan y verifican mediante algoritmo Módulo 11 oficial.
  - Se prohíben emparejamientos probabilísticos o búsquedas difusas sobre nombres genéricos para imputar vínculos contractuales o financieros.
  - Si un cruce carece de evidencia documental vinculante, se representa como no disponible (`null` / `"en verificación"`), evitando generar relaciones simuladas.

---

## 5. Cuarentena Metodológica de Anomalías Oficiales (Regla V7)

- **Sanidad de Datos de Origen:** Cuando las fuentes oficiales publican registros con inconsistencias extremas (por ejemplo, órdenes de compra en MercadoPúblico con columnas desplazadas, valores unitarios desproporcionados fuera de los límites de sanidad de $100.000 millones, o registros de dotación con horas extra superiores al límite mensual):
  1. **Preservación:** El registro original se mantiene intacto en el data lake como evidencia histórica inalterada.
  2. **Rotulación:** La ficha correspondiente exhibe un aviso de **"Hallazgo de Integridad ALTA (V7)"** documentando la orden o registro observado y enlazando a la fuente pública.
  3. **Exclusión de Agregados:** Dichos montos quedan excluidos del cálculo de totales transados, promedios y rankings comunales o institucionales para evitar distorsiones estadísticas.
