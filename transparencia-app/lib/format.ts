export function csvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  const text = /^[\t\r\n ]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return `"${text.replace(/"/g, '""')}"`;
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCLPCompact(amount: number): string {
  if (amount === 0) return "$0";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000_000) {
    const val = amount / 1_000_000_000_000;
    return `$${val.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} billones`;
  }
  if (abs >= 1_000_000_000) {
    const val = amount / 1_000_000_000;
    return `$${val.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} mil MM`;
  }
  if (abs >= 1_000_000) {
    const val = amount / 1_000_000;
    return `$${val.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} M`;
  }
  if (abs >= 1_000) {
    const val = amount / 1_000;
    return `$${val.toLocaleString("es-CL", { maximumFractionDigits: 0 })} k`;
  }
  return formatCLP(amount);
}

/** Formato compacto con 3 cifras significativas para montos consolidados (ej: $20.737 MM, $1.250 MM, $78,7 M, $450.000) */
export function formatMontoConsolidado(amount?: number | null): string {
  if (amount === undefined || amount === null || isNaN(amount) || amount <= 0) return "No monetario";
  const abs = Math.abs(amount);
  if (abs >= 1_000_000_000_000) {
    const val = amount / 1_000_000_000_000;
    return `$${val.toLocaleString("es-CL", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} billones`;
  }
  if (abs >= 1_000_000_000) {
    // Miles de millones -> $X MM (ej: 1.250.000.000 -> $1.250 MM, 20.736.541.839 -> $20.737 MM)
    const val = amount / 1_000_000;
    return `$${val.toLocaleString("es-CL", { maximumFractionDigits: 0 })} MM`;
  }
  if (abs >= 1_000_000) {
    // Millones -> $X M (ej: 78.703.387 -> $78,7 M)
    const val = amount / 1_000_000;
    return `$${val.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 1 })} M`;
  }
  return formatCLP(amount);
}

export function formatPct(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined) return "—";
  return `${value.toLocaleString("es-CL", { maximumFractionDigits: digits })}%`;
}

export function formatFechaCorta(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
}

const MESES_ES: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

/** Normaliza cualquier formato de fecha de nacimiento (AAAA-MM-DD, DD/MM/AAAA, "D de mes de AAAA") a ISO. */
export function normalizarFechaNacimiento(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  const iso = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const corta = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (corta) return `${corta[3]}-${corta[2].padStart(2, "0")}-${corta[1].padStart(2, "0")}`;
  const larga = t.match(/^(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/i);
  if (larga) {
    const mes = MESES_ES[larga[2].toLowerCase()];
    if (mes) return `${larga[3]}-${String(mes).padStart(2, "0")}-${larga[1].padStart(2, "0")}`;
  }
  return null;
}

/** Formato estándar chileno DD-MM-AAAA. Si no puede parsear, devuelve el texto original (nunca lanza). */
export function formatFechaChilena(iso: string | null | undefined): string {
  const n = normalizarFechaNacimiento(iso);
  if (!n) return iso ?? "";
  const [y, m, d] = n.split("-");
  return `${d}-${m}-${y}`;
}

/** Edad en años a la fecha de hoy (null si la fecha no es válida o es futura). */
export function edadEnAnos(fecha: string | null | undefined, hoy: Date = new Date()): number | null {
  const n = normalizarFechaNacimiento(fecha);
  if (!n) return null;
  const [y, m, d] = n.split("-").map(Number);
  let edad = hoy.getFullYear() - y;
  const mes = hoy.getMonth() + 1;
  if (mes < m || (mes === m && hoy.getDate() < d)) edad -= 1;
  return edad >= 0 && y <= hoy.getFullYear() ? edad : null;
}

/** Extrae la parte del apellido (paterno / materno) de un nombre completo formal en español. */
export function getApellido(nombreCompleto: string): string {
  const trimmed = nombreCompleto.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) return trimmed;
  if (parts.length === 2) return parts[1];
  // 3 o más palabras (ej. "Jaime Araya Guerrero" -> "Araya Guerrero", "Mario Guillermo Desbordes Jiménez" -> "Desbordes Jiménez")
  if (parts.length === 3) return `${parts[1]} ${parts[2]}`;
  return parts.slice(-2).join(" ");
}

/** Convierte un nombre completo al formato "Apellido N." (ej. "Paulina Núñez Urrutia" -> "Núñez P.") */
export function formatApellidoInicial(nombreCompleto: string): string {
  const parts = nombreCompleto.trim().split(/\s+/);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  const primerNombre = parts[0];
  const inicial = primerNombre.charAt(0).toUpperCase();
  if (parts.length === 2) {
    return `${parts[1]} ${inicial}.`;
  }
  const compuestos = new Set(["josé", "jose", "maría", "maria", "luis", "antonio", "manuel", "carlos", "pablo", "alberto", "ignacio", "juan"]);
  if (parts.length >= 4 && compuestos.has(parts[1].toLowerCase())) {
    return `${parts[2]} ${inicial}.`;
  }
  return `${parts[1]} ${inicial}.`;
}

/** Compara dos nombres completos ordenando alfabéticamente por apellido (A-Z). */
export function comparePorApellido(a: string, b: string): number {
  const apA = getApellido(a);
  const apB = getApellido(b);
  const cmp = apA.localeCompare(apB, "es-CL");
  if (cmp !== 0) return cmp;
  return a.localeCompare(b, "es-CL");
}
