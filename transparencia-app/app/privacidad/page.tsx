import type { Metadata } from "next";
import PrivacyRequestForm from "@/components/PrivacyRequestForm";

export const metadata: Metadata = {
  title: "Política de Privacidad — El Cambiómetro",
  description:
    "Cómo El Cambiómetro trata los datos personales: finalidades, fuentes, conservación y canal de solicitudes, con referencias a la Ley 19.628 y su reforma por la Ley 21.719.",
  alternates: { canonical: "/privacidad" },
};

const VERSION_FECHA = "29 de octubre de 2026";

const CATEGORIAS = [
  {
    titulo: "Navegación y estadísticas (solo con tu consentimiento)",
    finalidad: "Medir de forma agregada y anónima el volumen de visitas y las secciones más consultadas para mejorar la plataforma.",
    datos: "Páginas visitadas y datos técnicos de navegación utilizados por la herramienta de medición.",
    base: "Consentimiento para las herramientas de medición. Puedes rechazar en el banner de cookies sin perder ninguna funcionalidad.",
    conservacion: "Mientras esté vigente tu consentimiento y según la configuración de la herramienta de medición.",
  },
  {
    titulo: "Solicitudes de protección de datos personales",
    finalidad: "Atender, tramitar y responder tus solicitudes de acceso, rectificación, cancelación u oposición sobre datos que te conciernan, así como consultas de información.",
    datos: "Nombre (opcional), correo electrónico, tipo de solicitud y descripción. No solicitamos tu RUT ni otro dato sensible.",
    base: "Ejercicio de derechos y atención de solicitudes conforme a la normativa de protección de datos aplicable.",
    conservacion: "Política de conservación de solicitudes: 3 años desde la última gestión. La revisión y eliminación requieren gestión del responsable.",
  },
  {
    titulo: "Registro de seguridad",
    finalidad: "Detectar y bloquear abusos, intentos de fraude o ataques a la plataforma y preservar la evidencia técnica.",
    datos: "Hash de dirección IP, ruta consultada y evento de seguridad. El hash es una medida de seudonimización, no una garantía de anonimato.",
    base: "Protección de la plataforma frente a abusos y ataques, con acceso restringido a los registros de seguridad.",
    conservacion: "Política de conservación: 12 meses para eventos de seguridad y 7 días para registros de límites de solicitudes.",
  },
];

const FUENTES = [
  { organismo: "Cámara de Diputadas y Diputados", portal: "https://www.camara.cl", datos: "Votaciones, asistencias, gastos operacionales, personal de apoyo" },
  { organismo: "Senado de Chile", portal: "https://www.senado.cl", datos: "Votaciones, gastos parlamentarios" },
  { organismo: "ChileCompra (Dirección de Compras)", portal: "https://www.chilecompra.cl", datos: "Contrataciones públicas (OCDS)" },
  { organismo: "DIPRES", portal: "https://www.dipres.gob.cl", datos: "Ejecución presupuestaria" },
  { organismo: "SINIM (SUBdere)", portal: "https://www.sinim.gov.cl", datos: "Indicadores municipales" },
  { organismo: "Registros Ley 19.862", portal: "https://www.registros19862.cl", datos: "Transferencias de fondos públicos" },
  { organismo: "Consejo para la Transparencia", portal: "https://www.consejotransparencia.cl", datos: "Nómina nacional de funcionarios (transparencia activa)" },
  { organismo: "SERVEL", portal: "https://www.servel.cl", datos: "Resultados electorales" },
  { organismo: "InfoLobby", portal: "https://www.infolobby.cl", datos: "Audiencias, viajes y donativos declarados" },
  { organismo: "InfoProbidad", portal: "https://www.infoprobidad.cl", datos: "Declaraciones de intereses y patrimonio" },
  { organismo: "Contraloría General de la República", portal: "https://www.contraloria.cl", datos: "Informes de auditoría y examen de cuentas" },
  { organismo: "Instituto Nacional de Estadísticas", portal: "https://www.ine.gob.cl", datos: "Censo 2024: población, viviendas y hogares" },
];

const DERECHOS = [
  {
    derecho: "Acceso",
    texto: "Solicitar una copia de los datos personales que te conciernan y que estén siendo tratados por la plataforma.",
  },
  {
    derecho: "Rectificación",
    texto: "Corregir datos inexactos o incompletos que figuren en nuestros registros, adjuntando la evidencia que respalde el cambio.",
  },
  {
    derecho: "Cancelación (eliminación)",
    texto: "Solicitar la eliminación de tus datos personales cuando ya no sean necesarios para la finalidad declarada.",
  },
  {
    derecho: "Oposición",
    texto: "Solicitar la revisión de tu oposición al tratamiento de datos personales conforme a la normativa aplicable.",
  },
];

export default function PrivacidadPage() {
  return (
    <div className="page-shell" style={{ minHeight: "100vh" }}>
      <header className="page-masthead">
        <div className="container-main page-masthead__grid">
          <div>
            <span className="eyebrow">Plataforma de Datos Públicos</span>
            <h1 style={{ fontSize: "clamp(1.5rem, 3vw, 2.25rem)", margin: "0.25rem 0 0.5rem 0" }}>
              Política de Privacidad
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: 1.6, maxWidth: 720, margin: 0 }}>
              El Cambiómetro compila datos personales publicados por organismos públicos de Chile. Aquí explicamos
              cómo tratamos esos datos, con qué base legal, por cuánto tiempo y cómo puedes ejercer tus derechos
              conforme a la normativa de protección de datos personales aplicable.
            </p>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: 1.6, marginTop: "0.75rem" }}>
              Marco normativo: <a href="https://www.bcn.cl/leychile/navegar?idNorma=141599" target="_blank" rel="noopener noreferrer">Ley 19.628 ↗</a>{" "}
              y su reforma por la <a href="https://www.bcn.cl/leychile/navegar?idNorma=1209272" target="_blank" rel="noopener noreferrer">Ley 21.719 ↗</a>.
              Consulta su texto y vigencia en las fuentes oficiales.
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-subtle)", marginTop: "0.75rem" }}>
              <span className="badge badge-ok" style={{ fontSize: "0.68rem" }}>Versión {VERSION_FECHA}</span>
            </p>
          </div>
        </div>
      </header>

      <div className="container-main" style={{ padding: "2.5rem 1.5rem 4rem", display: "flex", flexDirection: "column", gap: "2.5rem" }}>

        <section className="privacy-category-section">
          <div className="privacy-request-panel__heading">
            <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
              Finalidad del tratamiento por categoría
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Tratamos únicamente los datos estrictamente necesarios para cada finalidad.
            </p>
          </div>
          <div className="privacy-category-grid">
            {CATEGORIAS.map((categoria) => (
              <article key={categoria.titulo} className="card privacy-category-card" style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>{categoria.titulo}</h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{categoria.finalidad}</p>
                <dl style={{ margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.78rem" }}>
                  <div><dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Datos: </dt><dd style={{ display: "inline", color: "var(--text-muted)" }}>{categoria.datos}</dd></div>
                  <div><dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Base de legitimación: </dt><dd style={{ display: "inline", color: "var(--text-muted)" }}>{categoria.base}</dd></div>
                  <div><dt style={{ fontWeight: 700, display: "inline", color: "var(--text-primary)" }}>Conservación: </dt><dd style={{ display: "inline", color: "var(--text-muted)" }}>{categoria.conservacion}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="card" style={{ padding: "1.75rem" }}>
          <div style={{ marginBottom: "1.25rem" }}>
            <span className="eyebrow">Origen de la Información</span>
            <h2 style={{ fontSize: "1.25rem", margin: "0.2rem 0 0.4rem 0" }}>Fuentes públicas consultadas</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Los conjuntos publicados conservan su fuente y su alcance. Movimientos también registra anuncios
              periodísticos identificados, separados de su confirmación oficial. Puedes consultar los cortes y limitaciones en Fuentes y Metodología.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))", gap: "0.75rem" }}>
            {FUENTES.map((fuente) => (
              <div key={fuente.organismo} style={{ padding: "0.75rem 1rem", background: "var(--bg-surface-2)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-primary)", display: "block" }}>{fuente.organismo}</strong>
                <a href={fuente.portal} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.7rem", color: "var(--accent)" }}>
                  {fuente.portal.replace("https://www.", "")} ↗
                </a>
                <span style={{ fontSize: "0.7rem", color: "var(--text-subtle)", display: "block", marginTop: "0.25rem" }}>{fuente.datos}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="privacy-form-layout">
          <div className="privacy-form-layout__heading" style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1.3rem", margin: "0 0 0.25rem 0", color: "var(--text-primary)" }}>
              Tus derechos: acceso, rectificación, cancelación y oposición
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              Puedes presentar solicitudes sobre el tratamiento de tus datos personales. Su procedencia y respuesta requieren revisión del responsable.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: "1rem" }}>
            {DERECHOS.map((derecho) => (
              <article key={derecho.derecho} style={{ padding: "1.25rem", background: "var(--bg-surface-2)", borderRadius: 12, border: "1px solid var(--border-subtle)" }}>
                <h3 style={{ fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.4rem 0", color: "var(--text-primary)" }}>{derecho.derecho}</h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{derecho.texto}</p>
              </article>
            ))}
          </div>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.6, margin: "1rem 0 0" }}>
            Las solicitudes se tramitan conforme al procedimiento y los plazos legales aplicables; el formulario no genera una resolución automática.
            También puedes contactarnos por correo en{" "}
            <a href="mailto:datos@cambiometro.impulsacv.cl" style={{ color: "var(--accent)", textDecoration: "underline" }}>
              datos@cambiometro.impulsacv.cl
            </a>.
          </p>
        </section>

        <section>
          <div style={{ marginBottom: "1.25rem" }}>
            <span className="eyebrow">Canal de Solicitudes</span>
            <h2 style={{ fontSize: "1.25rem", margin: "0.2rem 0 0.4rem 0" }}>Envíanos tu solicitud</h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0 }}>
              Completa el formulario y registraremos tu solicitud con fecha y número de folio. La verificación anti-bots
              protege el canal contra el envío automatizado de solicitudes.
            </p>
          </div>
          <div className="card privacy-request-panel__card">
            <PrivacyRequestForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? ""} />
          </div>
        </section>

      </div>
    </div>
  );
}
