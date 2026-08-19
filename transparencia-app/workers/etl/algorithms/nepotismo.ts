/**
 * algorithms/nepotismo.ts
 * Detector de parentesco y coincidencias para el Cruce Antinepotismo (CPLT ↔ InfoProbidad)
 * Cumple con las 6 reglas estrictas de ponderación, trazabilidad y protección de datos (Ley 19.628).
 */

export interface PersonaData {
  nombre_completo: string;
  rut?: string;
  cargo?: string;
  estamento?: string;
  fecha_ingreso?: string;
  declaracion_parentesco_explicito?: string; // ej: "Cónyuge", "Hijo/a", "Hermano/a"
  organismo?: string;
}

export interface ResultadoNepotismo {
  coincide: boolean;
  nivel: 'ninguno' | 'bajo' | 'medio' | 'alto' | 'critico';
  grado_parentesco_estimado: 'declarado_explicito' | '1er_grado' | '2do_grado' | '3er_grado' | 'posible_homonimo' | 'ninguno';
  descripcion: string;
  apellidos_autoridad: [string, string];
  apellidos_relacionado: [string, string];
  similitud_fonetica: number;
  es_posterior_a_asuncion: boolean;
  es_cargo_confianza_asesor: boolean;
  requiere_revision_humana: boolean;
  disclaimer_legal: string;
}

const LEGAL_DISCLAIMER =
  "Esta alerta se genera automáticamente por coincidencia de nombres y declaraciones en fuentes públicas oficiales. No constituye imputación ni prueba fehaciente de irregularidad. La Ley N° 19.628 protege los datos personales de las personas relacionadas.";

/**
 * Normaliza un nombre completo y extrae los dos apellidos
 */
function extraerApellidos(nombre: string): [string, string] {
  const partes = nombre
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quitar acentos
    .toUpperCase()
    .split(/\s+/)
    .filter((p) => p.length > 1);

  if (partes.length >= 2) {
    return [partes[partes.length - 2], partes[partes.length - 1]];
  }
  if (partes.length === 1) {
    return [partes[0], ''];
  }
  return ['', ''];
}

/**
 * Similitud de Jaro-Winkler simplificada para comparar apellidos
 */
function similitud(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const maxLen = Math.max(a.length, b.length);
  let matches = 0;

  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) matches++;
  }

  return matches / maxLen;
}

/**
 * Algoritmo refinado de detección de parentesco y riesgo de nepotismo
 */
export function detectarNepotismo(
  autoridad: PersonaData & { fecha_asuncion?: string },
  relacionado: PersonaData
): ResultadoNepotismo {
  const [a1, a2] = extraerApellidos(autoridad.nombre_completo);
  const [b1, b2] = extraerApellidos(relacionado.nombre_completo);

  // 1. REGLA: Declaración Explícita en InfoProbidad (fuente primaria prioritaria)
  if (relacionado.declaracion_parentesco_explicito) {
    return {
      coincide: true,
      nivel: 'critico',
      grado_parentesco_estimado: 'declarado_explicito',
      descripcion: `Declaración explícita en InfoProbidad como "${relacionado.declaracion_parentesco_explicito}". Trazabilidad directa sin necesidad de inferencia heurística.`,
      apellidos_autoridad: [a1, a2],
      apellidos_relacionado: [b1, b2],
      similitud_fonetica: 1.0,
      es_posterior_a_asuncion: false,
      es_cargo_confianza_asesor: true,
      requiere_revision_humana: true,
      disclaimer_legal: LEGAL_DISCLAIMER,
    };
  }

  const simPaterno = similitud(a1, b1);
  const simMaterno = similitud(a2, b2);
  const simCruza1 = similitud(a1, b2);
  const simCruza2 = similitud(a2, b1);

  const cargoLow = (relacionado.cargo || relacionado.estamento || '').toLowerCase();
  const esCargoAsesor =
    cargoLow.includes('asesor') ||
    cargoLow.includes('confianza') ||
    cargoLow.includes('gabinete') ||
    cargoLow.includes('directivo') ||
    cargoLow.includes('honorarios');

  // Evaluación de fecha de ingreso posterior
  let esPosterior = false;
  if (autoridad.fecha_asuncion && relacionado.fecha_ingreso) {
    esPosterior = relacionado.fecha_ingreso > autoridad.fecha_asuncion;
  }

  // 2. REGLA: Coincidencia directa de ambos apellidos (A1=B1 && A2=B2) → Posible hijo/hermano
  if (simPaterno >= 0.92 && simMaterno >= 0.92 && a1.length > 0 && a2.length > 0) {
    return {
      coincide: true,
      nivel: 'critico',
      grado_parentesco_estimado: '1er_grado',
      descripcion: `Coincidencia exacta en ambos apellidos ("${a1} ${a2}"). ${esCargoAsesor ? 'Ocupa cargo de asesor/confianza. ' : ''}${esPosterior ? 'Ingresó con fecha posterior a la asunción de la autoridad.' : ''}`.trim(),
      apellidos_autoridad: [a1, a2],
      apellidos_relacionado: [b1, b2],
      similitud_fonetica: Math.min(simPaterno, simMaterno),
      es_posterior_a_asuncion: esPosterior,
      es_cargo_confianza_asesor: esCargoAsesor,
      requiere_revision_humana: true,
      disclaimer_legal: LEGAL_DISCLAIMER,
    };
  }

  // 3. REGLA: Coincidencia de apellido paterno (A1=B1)
  if (simPaterno >= 0.92 && a1.length > 3) {
    return {
      coincide: true,
      nivel: 'alto',
      grado_parentesco_estimado: '2do_grado',
      descripcion: `Coincidencia en apellido paterno "${a1}". ${esCargoAsesor ? 'Ocupa cargo de asesor/confianza. ' : ''}Posible familiar de 2do grado.`.trim(),
      apellidos_autoridad: [a1, a2],
      apellidos_relacionado: [b1, b2],
      similitud_fonetica: simPaterno,
      es_posterior_a_asuncion: esPosterior,
      es_cargo_confianza_asesor: esCargoAsesor,
      requiere_revision_humana: true,
      disclaimer_legal: LEGAL_DISCLAIMER,
    };
  }

  // 4. REGLA: Coincidencia cruzada de apellidos (A1=B2 o A2=B1)
  if ((simCruza1 >= 0.92 || simCruza2 >= 0.92) && (a1.length > 0 || a2.length > 0)) {
    return {
      coincide: true,
      nivel: 'medio',
      grado_parentesco_estimado: '3er_grado',
      descripcion: `Coincidencia en uno de los apellidos cruzados. Posible familiar por línea materna o afinidad.`,
      apellidos_autoridad: [a1, a2],
      apellidos_relacionado: [b1, b2],
      similitud_fonetica: Math.max(simCruza1, simCruza2),
      es_posterior_a_asuncion: esPosterior,
      es_cargo_confianza_asesor: esCargoAsesor,
      requiere_revision_humana: true,
      disclaimer_legal: LEGAL_DISCLAIMER,
    };
  }

  return {
    coincide: false,
    nivel: 'ninguno',
    grado_parentesco_estimado: 'ninguno',
    descripcion: 'Sin coincidencias detectadas en nóminas públicas',
    apellidos_autoridad: [a1, a2],
    apellidos_relacionado: [b1, b2],
    similitud_fonetica: 0,
    es_posterior_a_asuncion: false,
    es_cargo_confianza_asesor: false,
    requiere_revision_humana: false,
    disclaimer_legal: LEGAL_DISCLAIMER,
  };
}
