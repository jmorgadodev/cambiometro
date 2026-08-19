import React from "react";

export type IconoNombre =
  | "organismo"
  | "votaciones"
  | "dinero"
  | "compras"
  | "lobby"
  | "cgr"
  | "declaraciones"
  | "etl"
  | "personas"
  | "territorio"
  | "cruces"
  | "datos"
  | "principios"
  | "anomalia"
  | "sun"
  | "moon"
  | "search"
  | "check"
  | "arrow-right"
  | "external-link"
  | "menu"
  | "close"
  | "shield";

interface IconoProps extends React.SVGProps<SVGSVGElement> {
  nombre: IconoNombre;
  size?: number | string;
  accentColor?: string;
  className?: string;
}

/**
 * Sistema de Iconografía Canónica Propia Monoline — El Cambiómetro
 * Especificaciones: Grid 24x24 · Trazo 1.5px · Terminaciones redondeadas · currentColor · 1 detalle --accent
 */
export default function Icono({
  nombre,
  size = 20,
  accentColor = "var(--accent)",
  className = "",
  style,
  ...rest
}: IconoProps) {
  const commonProps = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: `icono-monoline ${className}`.trim(),
    style: { display: "inline-block", verticalAlign: "middle", flexShrink: 0, ...style },
    ...rest,
  };

  switch (nombre) {
    // 1. Organismo: Frontón institucional clásico + columnas + arco/puerta
    case "organismo":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M3 9.5L12 4.5L21 9.5" />
          <path d="M5 9.5V19.5" />
          <path d="M9 9.5V19.5" />
          <path d="M15 9.5V19.5" />
          <path d="M19 9.5V19.5" />
          <path d="M2 19.5H22" />
          {/* Detalle de acento: arco central superior */}
          <path d="M10 6.5A2 2 0 0 1 14 6.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 2. Votaciones: Urna electoral con ranura + papeleta con check
    case "votaciones":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 10V20C4 20.5523 4.44772 21 5 21H19C19.5523 21 20 20.5523 20 20V10" />
          <path d="M2 10H22" />
          <path d="M8 10V5C8 4.44772 8.44772 4 9 4H15C15.5523 4 16 4.44772 16 5V10" />
          {/* Detalle de acento: marca de voto check */}
          <path d="M10.5 6.5L11.5 7.5L13.5 5.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 3. Dinero: Moneda circular con símbolo $ y detalle de valor
    case "dinero":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6.5V17.5" />
          <path d="M14.5 9C14.5 7.6 13.4 7 12 7C10.6 7 9.5 7.6 9.5 9C9.5 10.4 10.6 11 12 11C13.4 11 14.5 11.6 14.5 13C14.5 14.4 13.4 15 12 15C10.6 15 9.5 14.4 9.5 13" />
          {/* Detalle de acento: brillo sutil */}
          <circle cx="16" cy="8" r="0.75" fill={accentColor} stroke="none" />
        </svg>
      );

    // 4. Compras: Tag/etiqueta de compra con perforación y pliegue
    case "compras":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12.5 3H6C4.89543 3 4 3.89543 4 5V11.5L13.5 21L21 13.5L12.5 3Z" />
          <circle cx="8" cy="7" r="1.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 5. Lobby: Dos burbujas de diálogo entrelazadas
    case "lobby":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M7 16H4C3.44772 16 3 15.5523 3 15V6C3 5.44772 3.44772 5 4 5H14C14.5523 5 15 5.44772 15 6V9" />
          <path d="M17 19L20.5 21V11C20.5 10.4477 20.0523 10 19.5 10H10.5C9.94772 10 9.5 10.4477 9.5 11V18C9.5 18.5523 9.94772 19 10.5 19H17Z" />
          {/* Detalle de acento: punto de comunicación */}
          <circle cx="15" cy="14.5" r="0.75" fill={accentColor} stroke="none" />
        </svg>
      );

    // 6. CGR: Balanza de justicia de dos platillos
    case "cgr":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 3V21" />
          <path d="M8 21H16" />
          <path d="M4 7L12 5L20 7" />
          <path d="M4 7L2 14C2 15.5 3.5 16 4 16C4.5 16 6 15.5 6 14L4 7Z" />
          <path d="M20 7L18 14C18 15.5 19.5 16 20 16C20.5 16 22 15.5 22 14L20 7Z" />
          {/* Detalle de acento: fulcro superior */}
          <circle cx="12" cy="5" r="1.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 7. Declaraciones: Página doblada con líneas de documento
    case "declaraciones":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M14 3H6C4.89543 3 4 3.89543 4 5V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V9L14 3Z" />
          <path d="M14 3V9H20" />
          <path d="M8 13H16" />
          <path d="M8 17H13" />
          {/* Detalle de acento: sello/viñeta */}
          <circle cx="16" cy="17" r="0.75" fill={accentColor} stroke="none" />
        </svg>
      );

    // 8. ETL: Arco de ciclo con flecha sincronizada
    case "etl":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M21 12A9 9 0 0 0 6 5.3L3 8" />
          <path d="M3 3V8H8" />
          <path d="M3 12A9 9 0 0 0 18 18.7L21 16" />
          <path d="M21 21V16H16" />
          {/* Detalle de acento: núcleo de sincronización */}
          <circle cx="12" cy="12" r="1.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 9. Personas: Dos cabezas / bustos superpuestos
    case "personas":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M16 21V19C16 17.3431 14.6569 16 13 16H6C4.34315 16 3 17.3431 3 19V21" />
          <circle cx="9.5" cy="8.5" r="4.5" />
          <path d="M21 21V19C21 17.7 20.2 16.6 19 16.2" />
          <path d="M15.5 4.3C16.8 4.9 17.7 6.2 17.7 7.7C17.7 9.2 16.8 10.5 15.5 11.1" stroke={accentColor} />
        </svg>
      );

    // 10. Territorio: Pin de mapa / ubicación geográfica
    case "territorio":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 21C16 16.5 19 13.5 19 9.5C19 5.63401 15.866 2.5 12 2.5C8.13401 2.5 5 5.63401 5 9.5C5 13.5 8 16.5 12 21Z" />
          <circle cx="12" cy="9.5" r="2.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 11. Cruces: Dos nodos circulares conectados por una arista vectorial
    case "cruces":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="6" cy="7" r="3" />
          <circle cx="18" cy="17" r="3" />
          <path d="M8.5 8.5L15.5 15.5" />
          <circle cx="18" cy="7" r="1.5" stroke={accentColor} />
          <path d="M8.5 7H16.5" stroke={accentColor} strokeDasharray="2 2" />
        </svg>
      );

    // 12. Datos: 3 barras de gráfico con progresión analítica
    case "datos":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M3 20H21" />
          <path d="M6 20V14H9V20" />
          <path d="M11 20V9H14V20" />
          <path d="M16 20V4H19V20" />
          {/* Detalle de acento: punto de pico analítico */}
          <circle cx="17.5" cy="4" r="0.75" fill={accentColor} stroke="none" />
        </svg>
      );

    // 13. Principios / Shield: Escudo de rigor institucional
    case "principios":
    case "shield":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 3L4 6V11C4 16.5 7.5 20.5 12 22C16.5 20.5 20 16.5 20 11V6L12 3Z" />
          <path d="M12 7V17" stroke={accentColor} strokeWidth={1.8} />
          <path d="M9 12H15" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 14. Anomalía: Triángulo con signo de exclamación
    case "anomalia":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M10.29 3.86L1.82 18C1.64 18.3 1.55 18.65 1.55 19C1.55 20.1 2.45 21 3.55 21H20.45C20.8 21 21.15 20.91 21.45 20.73C22.4 20.18 22.73 18.96 22.18 18.01L13.71 3.86C13.53 3.56 13.27 3.32 12.96 3.17C11.99 2.69 10.81 3.08 10.29 3.86Z" />
          <path d="M12 9V13" />
          <circle cx="12" cy="17" r="0.75" fill={accentColor} stroke="none" />
        </svg>
      );

    // 15. Sun: Sol para modo claro
    case "sun":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2V4" />
          <path d="M12 20V22" />
          <path d="M4.93 4.93L6.34 6.34" />
          <path d="M17.66 17.66L19.07 19.07" />
          <path d="M2 12H4" />
          <path d="M20 12H22" />
          <path d="M4.93 19.07L6.34 17.66" />
          <path d="M17.66 6.34L19.07 4.93" />
        </svg>
      );

    // 16. Moon: Luna para modo oscuro
    case "moon":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3A7 7 0 0 0 21 12.79Z" />
          <circle cx="16" cy="8" r="0.6" fill={accentColor} stroke="none" />
        </svg>
      );

    // 17. Search / Lupa
    case "search":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M16 16L21 21" />
        </svg>
      );

    // 18. Check
    case "check":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M20 6L9 17L4 12" />
        </svg>
      );

    // 19. Arrow Right
    case "arrow-right":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M5 12H19" />
          <path d="M12 5L19 12L12 19" />
        </svg>
      );

    // 20. External Link
    case "external-link":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11" />
          <path d="M15 3H21V9" />
          <path d="M10 14L21 3" />
        </svg>
      );

    // 21. Menu hamburguesa
    case "menu":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 6H20" />
          <path d="M4 12H20" />
          <path d="M4 18H20" />
        </svg>
      );

    // 22. Close
    case "close":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M18 6L6 18" />
          <path d="M6 6L18 18" />
        </svg>
      );

    default:
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
}
