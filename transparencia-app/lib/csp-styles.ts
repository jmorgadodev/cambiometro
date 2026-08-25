const STATIC_NONCE = "cambiometro-static-v1";

// React agrega px a los números de propiedades que no son unitless. La lista
// coincide con el comportamiento de React DOM y evita cambios visuales al
// mover los estilos a una hoja CSS estática.
const UNITLESS = new Set([
  "animationIterationCount", "aspectRatio", "borderImageOutset", "borderImageSlice",
  "borderImageWidth", "boxFlex", "boxFlexGroup", "boxOrdinalGroup", "columnCount",
  "columns", "flex", "flexGrow", "flexPositive", "flexShrink", "flexNegative",
  "flexOrder", "gridArea", "gridRow", "gridRowEnd", "gridRowSpan", "gridRowStart",
  "gridColumn", "gridColumnEnd", "gridColumnSpan", "gridColumnStart", "fontWeight",
  "lineClamp", "lineHeight", "opacity", "order", "orphans", "tabSize", "widows",
  "zIndex", "zoom", "fillOpacity", "floodOpacity", "stopOpacity", "strokeDasharray",
  "strokeDashoffset", "strokeMiterlimit", "strokeOpacity", "strokeWidth",
]);

function cssPropertyName(name: string) {
  if (name.startsWith("--")) return name;
  return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function cssValue(name: string, value: unknown) {
  if (value === null || value === undefined || typeof value === "boolean" || typeof value === "function") return null;
  if (typeof value === "number" && value !== 0 && !UNITLESS.has(name) && !name.startsWith("--")) return `${value}px`;
  const text = String(value);
  // El valor llega desde props/estado y se inserta en una regla CSS de runtime.
  // Nunca permitir que un dato cierre una declaración o un bloque CSS.
  if (/[;{}]/.test(text) || /<\/?style\b/i.test(text)) return null;
  return text;
}

export function serializeCspStyle(style: unknown) {
  if (!style || typeof style !== "object") return "";
  return Object.entries(style as Record<string, unknown>)
    .map(([name, value]) => {
      const normalized = cssValue(name, value);
      return normalized === null ? "" : `${cssPropertyName(name)}:${normalized}`;
    })
    .filter(Boolean)
    .join(";");
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

export function cspStyle(style: unknown) {
  const declarations = serializeCspStyle(style);
  if (!declarations) return "";
  const className = `csp-${hash(declarations)}`;
  if (typeof document !== "undefined") {
    let sheet = document.querySelector<HTMLStyleElement>("style[data-csp-runtime-styles]");
    if (!sheet) {
      sheet = document.createElement("style");
      sheet.dataset.cspRuntimeStyles = "true";
      sheet.nonce = STATIC_NONCE;
      document.head.appendChild(sheet);
    }
    if (!sheet.textContent?.includes(`.${className}{`)) {
      sheet.appendChild(document.createTextNode(`.${className}{${declarations}}`));
    }
  }
  return className;
}

export function cspStyleData(style: unknown) {
  return serializeCspStyle(style);
}

export function cspClassName(existing: unknown, generated: unknown) {
  return [existing, generated].filter((value) => typeof value === "string" && value.trim()).join(" ");
}
