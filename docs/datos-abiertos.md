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

---

## 6. Coaliciones de Gobierno y Oposición (desde 11-03-2026)

- **Criterio:** Clasificación editorial de oficialismo/oposición según gobierno en ejercicio desde el 11-03-2026; revisada manualmente el 22-08-2026 tras feedback externo.
- **Oficialismo (gobierno Kast):** UDI, RN, Evópoli, DEM, AMA, REP, PNL, PSC, PDG — *DEM/AMA/Evópoli confirmados en gabinete 02-02-2026 (Emol: Ximena Rincón ministra Energía por Demócratas, Francisco Undurraga ministro Cultura por Evópoli, Andrés Jouannet subsecretario Seguridad por Amarillos).*
- **Oposición:** FA, PS, PC, PPD, PDC, PL, PR, FRVS — *PDC confirmada como oposición: ADN Radio 10-07-2026, Álvaro Ortiz “Somos oposición, pero no de trinchera”.*
- **Independientes:** IND inalterado.
- **Dudosos sin fuente dura:** PDG clasificado como oficialismo por inversión editorial; fuentes reales lo describen como bisagra no oficialista (“no somos oficialismo” Infobae 20-07-2026; BioBio 18-02-2026 “será oposición si Kast impulsa agenda valórica”). Se aplica swap igual y se declara clasificación editorial sin fuente dura.

---

## 7. Qué Significa el Hallazgo de Integridad y su Porcentaje (Regla V2)

- **Propósito:** Brindar máxima transparencia y legibilidad ciudadana ante diferencias entre los montos publicados en nóminas oficiales de personal de apoyo parlamentario y las bases mensuales asignadas por el Consejo Resolutivo de Asignaciones Parlamentarias.
- **Cálculo del Porcentaje de Exceso:**
  $$\text{Porcentaje de Exceso} = \frac{\text{Total Publicado} - \text{Base Oficial}}{\text{Base Oficial}} \times 100$$
  El porcentaje se calcula dinámicamente a partir de los datos oficiales de cada período, expresándose en formato chileno con un decimal y signo positivo (por ejemplo, `+17,4%` o `+33,7%`).
- **Umbrales Metodológicos V2 (cuando no existe traspaso individual acreditado):**
  - **Hallazgo de Integridad ALTA (exceso de hasta 40%):** Aplica cuando el monto total publicado excede la base mensual oficial hasta en un 40% (ej. caso Kaiser julio 2026 con `+33,7%` de exceso).
  - **Hallazgo de Integridad CRÍTICA (exceso superior al 40%):** Aplica cuando el monto total publicado supera en más de un 40% la base mensual oficial sin respaldo de transferencias acreditadas.
- **Declaración de No Imputación:** La presencia de un hallazgo de integridad señala una discrepancia contable o documental respecto al estándar base publicado y no constituye por sí misma una imputación de ilicitud, dolo ni falta administrativa.

---

## 8. Población Comunal y Presupuesto Per Cápita (Censo INE)

- **Estado de Publicación:** El dataset de población desagregada por comuna del **Censo 2024 (Instituto Nacional de Estadísticas - INE)** aún no se encuentra disponible en formato abierto descargable para las 346 comunas.
- **Tratamiento Metodológico (Regla R10):**
  - Conforme a la regla de integridad R10, la plataforma prohíbe el uso de cifras sintéticas o derivadas de nóminas de personal.
  - Hasta que el INE publique oficialmente el dataset comunal en datos abiertos, el indicador de población comunal y el presupuesto per cápita se presentan como `"No publicado por la fuente"` con valor `"—"`.


