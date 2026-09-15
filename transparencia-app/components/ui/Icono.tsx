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
 * Sistema de iconografía propia — El Cambiómetro
 *
 * Los glifos de dominio usan una lógica de "instrumento de evidencia":
 * marcos abiertos, nodos de trazabilidad y una marca de lectura en acento.
 * No dependen de una librería externa ni de emojis, para conservar una firma
 * visual reconocible en escritorio y móvil.
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
    // 1. Organismo: módulo institucional con registro y punto de origen
    case "organismo":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M5 19V8.5L12 4L19 8.5V19" />
          <path d="M8 12H16M8 16H16" />
          <path d="M8 19V9.5M16 19V9.5" stroke={accentColor} />
          <circle cx="12" cy="8" r="1.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 2. Votaciones: papeleta dentro de un marco de decisión
    case "votaciones":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M5 4H19V20H5Z" />
          <path d="M8 8H13M8 12H13M8 16H13" />
          <path d="M15 11L16.5 12.5L19.5 9.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 3. Dinero: ficha de valor con lectura ascendente
    case "dinero":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 3.5A8.5 8.5 0 1 1 5.2 17.1" />
          <path d="M12 7V17M9 9.5H13.5A2 2 0 0 1 13.5 13.5H10.5A2 2 0 0 0 10.5 17H15" />
          <path d="M5.2 17.1L3.5 14.5M5.2 17.1L8 16.5" stroke={accentColor} strokeWidth={1.8} />
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

    // 5. Lobby: conversación como relación entre dos nodos
    case "lobby":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="7" cy="8" r="3.5" />
          <circle cx="17" cy="16" r="3.5" stroke={accentColor} />
          <path d="M9.8 10.1L14.2 13.9" />
          <path d="M5.5 12.5L4 15.5L7 14" />
          <path d="M19 19L20 21L16.8 19.8" stroke={accentColor} />
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

    // 9. Personas: constelación de identidades relacionadas
    case "personas":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="8" cy="8" r="3.5" />
          <circle cx="17" cy="7" r="2.5" stroke={accentColor} />
          <circle cx="14" cy="17" r="3" />
          <path d="M10.8 9.5L12.5 14M14.3 8.8L14.1 14M10.5 17H8.5C6.3 17 4.5 18.8 4.5 21" />
        </svg>
      );

    // 10. Territorio: mapa abierto con coordenadas y frontera
    case "territorio":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 6.5L9 4L15 6L20 3.5V17.5L15 20L9 18L4 20.5Z" />
          <path d="M9 4V18M15 6V20" />
          <path d="M11 11.5C11 10.4 12 9.5 13 9.5C14 9.5 15 10.4 15 11.5C15 13 13 14.2 13 14.2C13 14.2 11 13 11 11.5Z" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 11. Cruces: grafo documental con nodo de evidencia central
    case "cruces":
      return (
        <svg {...commonProps} aria-hidden="true">
          <circle cx="5.5" cy="6" r="2.5" />
          <circle cx="18.5" cy="6" r="2.5" />
          <circle cx="12" cy="18" r="3" stroke={accentColor} />
          <path d="M7.7 7.3L10.4 15M16.3 7.3L13.6 15M8 6H16" />
          <path d="M11 17L12 18L13 17" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 12. Datos: registro de señales, no un gráfico genérico
    case "datos":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M4 5V19H20" />
          <path d="M7 15L10 12L13 14L18 8" stroke={accentColor} strokeWidth={1.8} />
          <circle cx="7" cy="15" r="1" />
          <circle cx="10" cy="12" r="1" />
          <circle cx="13" cy="14" r="1" />
          <circle cx="18" cy="8" r="1.5" stroke={accentColor} strokeWidth={1.8} />
        </svg>
      );

    // 13. Principios / Shield: escudo con dial de verificación
    case "principios":
    case "shield":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 3L4.5 6.2V11C4.5 16.2 7.6 20.1 12 21C16.4 20.1 19.5 16.2 19.5 11V6.2L12 3Z" />
          <circle cx="12" cy="12" r="3.5" stroke={accentColor} strokeWidth={1.8} />
          <path d="M12 12L14.6 9.6" stroke={accentColor} strokeWidth={1.8} />
          <path d="M12 7V5.5M12 18.5V17" />
        </svg>
      );

    // 14. Anomalía: alerta de dato fuera de patrón
    case "anomalia":
      return (
        <svg {...commonProps} aria-hidden="true">
          <path d="M12 3L21 12L12 21L3 12L12 3Z" />
          <path d="M12 8V14" stroke={accentColor} strokeWidth={1.8} />
          <circle cx="12" cy="17" r="1" fill={accentColor} stroke="none" />
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
