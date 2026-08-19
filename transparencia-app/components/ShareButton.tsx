"use client";

import { useState, useCallback } from "react";

interface ShareButtonProps {
  title: string;
  text?: string;
  url?: string;
  variant?: "primary" | "secondary" | "subtle";
  label?: string;
  className?: string;
  /** @deprecated Generación de imágenes cliente eliminada (sharp server-side) */
  captureTargetId?: string;
}

export default function ShareButton({
  title,
  text,
  url,
  variant = "secondary",
  label = "Compartir",
  className = "",
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFull, setCopiedFull] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const getShareUrl = useCallback(() => {
    if (typeof window === "undefined") return url || "https://cambiometro.impulsacv.cl";
    return url ? (url.startsWith("http") ? url : `${window.location.origin}${url}`) : window.location.href;
  }, [url]);

  const shareUrl = getShareUrl();
  const defaultText = "Revisa este análisis en El Cambiómetro, plataforma de datos públicos consolidados.";
  const fullShareText = text || `${title} — ${defaultText}`;
  const fullTextWithUrl = `${fullShareText} ${shareUrl}`;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 4000);
  };

  const copyToClipboard = async (contentToCopy: string): Promise<boolean> => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(contentToCopy);
        return true;
      }
      throw new Error("Clipboard API unavailable");
    } catch {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = contentToCopy;
        textArea.style.position = "fixed";
        textArea.style.left = "-9999px";
        textArea.style.top = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        return successful;
      } catch {
        return false;
      }
    }
  };

  // 1. Abrir Modal Propio del Sitio (nunca navigator.share directo al hacer clic en Compartir)
  const handleOpenClick = () => {
    setIsOpen(true);
  };

  // 2. Copiar solo enlace
  const handleCopyLinkOnly = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // 3. Copiar texto + enlace garantizado
  const handleCopyTextAndLink = async () => {
    const ok = await copyToClipboard(fullTextWithUrl);
    if (ok) {
      setCopiedFull(true);
      showToast("📋 Texto y enlace copiados: pégalos en tu publicación");
      setTimeout(() => setCopiedFull(false), 2500);
    }
  };

  // 4. Compartir en X (Twitter): Copia al clipboard + Toast + Abrir Intent
  const handleShareX = async (e: React.MouseEvent) => {
    e.preventDefault();
    await copyToClipboard(fullTextWithUrl);
    showToast("📋 Texto y enlace copiados: pégalos en tu publicación");
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullShareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(tweetUrl, "_blank", "noopener,noreferrer");
  };

  // 5. Otras opciones (sistema / navigator.share secundario)
  const handleSystemShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title,
          text: fullShareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          console.warn("System share error:", err);
        }
      }
    }
    // Fallback si no está soportado o fue cancelado
    await handleCopyTextAndLink();
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(fullShareText);
  const encodedTextWithUrl = encodeURIComponent(`${fullShareText} ${shareUrl}`);

  return (
    <>
      <button
        type="button"
        id="btn-abrir-compartir"
        onClick={handleOpenClick}
        className={`share-btn share-btn--${variant} ${className}`.trim()}
        aria-label={`Compartir ${title}`}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <span>{label}</span>
      </button>

      {/* Modal accesible de Compartir V2 */}
      {isOpen && (
        <div
          id="modal-compartir-v2"
          className="drawer-overlay"
          onClick={() => setIsOpen(false)}
          style={{
            display: "grid",
            placeItems: "center",
            padding: "1rem",
            zIndex: 1100,
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-modal-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "1.5rem",
              maxWidth: 480,
              width: "100%",
              boxShadow: "0 14px 40px var(--overlay-shadow, var(--border))",
              display: "flex",
              flexDirection: "column",
              gap: "1.1rem",
              position: "relative",
            }}
          >
            {/* Header del Modal */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 id="share-modal-title" style={{ margin: 0, fontSize: "1.15rem", color: "var(--text-1)", fontWeight: 700 }}>
                Compartir ficha pública
              </h3>
              <button
                type="button"
                id="btn-cerrar-modal-compartir"
                onClick={() => setIsOpen(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "1.5rem",
                  color: "var(--text-3)",
                  cursor: "pointer",
                  padding: "0.2rem 0.5rem",
                  lineHeight: 1,
                }}
                aria-label="Cerrar ventana"
              >
                &times;
              </button>
            </div>

            {/* Preview del texto exacto que se copiará */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
                Vista previa del texto
              </span>
              <div
                id="share-text-preview"
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-1)",
                  background: "var(--surface-2)",
                  padding: "0.85rem",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  lineHeight: 1.45,
                  userSelect: "all",
                  wordBreak: "break-word",
                }}
              >
                {fullTextWithUrl}
              </div>
            </div>

            {/* Botón Principal: Copiar texto + enlace */}
            <button
              type="button"
              id="btn-copiar-texto-enlace"
              onClick={handleCopyTextAndLink}
              className="btn btn-primary"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                fontSize: "0.9rem",
                fontWeight: 700,
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <span>📋</span>
              <span>{copiedFull ? "✓ Texto y enlace copiados" : "Copiar texto + enlace"}</span>
            </button>

            {/* Redes sociales */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.74rem", fontWeight: 700, color: "var(--text-3)", textTransform: "uppercase" }}>
                Enviar a redes
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                {/* 1. X (Twitter) - Con copia garantizada y toast */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`}
                  id="share-btn-x"
                  onClick={handleShareX}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.6rem 0.5rem",
                    minHeight: "44px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                  title="Compartir en X (copia automáticamente el texto y enlace al portapapeles)"
                >
                  <span style={{ fontWeight: 800 }}>𝕏</span>
                  <span>X (Twitter)</span>
                </a>

                {/* 2. WhatsApp (lleva texto completo) */}
                <a
                  href={`https://api.whatsapp.com/send?text=${encodedTextWithUrl}`}
                  id="share-btn-whatsapp"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.6rem 0.5rem",
                    minHeight: "44px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <span>💬</span>
                  <span>WhatsApp</span>
                </a>

                {/* 3. Telegram (lleva texto completo) */}
                <a
                  href={`https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`}
                  id="share-btn-telegram"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.6rem 0.5rem",
                    minHeight: "44px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <span>✈️</span>
                  <span>Telegram</span>
                </a>

                {/* 4. LinkedIn (url) */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
                  id="share-btn-linkedin"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.6rem 0.5rem",
                    minHeight: "44px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <span>💼</span>
                  <span>LinkedIn</span>
                </a>

                {/* 5. Facebook (url) */}
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                  id="share-btn-facebook"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.6rem 0.5rem",
                    minHeight: "44px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <span>📘</span>
                  <span>Facebook</span>
                </a>

                {/* 6. Email (asunto + texto + url) */}
                <a
                  href={`mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%0A%0A${encodedUrl}`}
                  id="share-btn-email"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.4rem",
                    padding: "0.6rem 0.5rem",
                    minHeight: "44px",
                    background: "var(--surface-2)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    color: "var(--text-1)",
                    textDecoration: "none",
                    fontSize: "0.8rem",
                    fontWeight: 600,
                  }}
                >
                  <span>✉️</span>
                  <span>Email</span>
                </a>
              </div>
            </div>

            {/* Enlace solo y Otras opciones del sistema */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.2rem" }}>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  style={{
                    flex: 1,
                    padding: "0.55rem 0.75rem",
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: "0.78rem",
                    color: "var(--text-1)",
                    fontFamily: "var(--font-mono)",
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <button
                  type="button"
                  id="btn-copiar-solo-enlace"
                  onClick={handleCopyLinkOnly}
                  className="btn btn-secondary"
                  style={{
                    padding: "0.55rem 0.9rem",
                    fontSize: "0.78rem",
                    whiteSpace: "nowrap",
                  }}
                >
                  {copiedLink ? "✓ Enlace copiado" : "Copiar enlace"}
                </button>
              </div>

              <button
                type="button"
                id="btn-otras-opciones-sistema"
                onClick={handleSystemShare}
                className="btn btn-secondary"
                style={{
                  width: "100%",
                  padding: "0.6rem 1rem",
                  fontSize: "0.8rem",
                  color: "var(--text-2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                <span>📲</span>
                <span>Otras opciones (sistema)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notificación */}
      {toastMessage && (
        <div
          id="share-toast-notification"
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: "1.5rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "var(--text-1)",
            color: "var(--bg)",
            padding: "0.75rem 1.25rem",
            borderRadius: 99,
            fontSize: "0.84rem",
            fontWeight: 600,
            boxShadow: "0 8px 24px var(--overlay-shadow, var(--border))",
            zIndex: 1200,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            maxWidth: "90vw",
            textAlign: "center",
            pointerEvents: "none",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {toastMessage}
        </div>
      )}
    </>
  );
}
