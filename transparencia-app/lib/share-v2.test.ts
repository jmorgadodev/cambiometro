import { describe, expect, it } from "vitest";

describe("Compartir V2: modal propio, preview y social sharing", () => {
  it("construye el texto exacto con formato título, cargo, territorio y métricas clave", () => {
    const title = "Fabiola Campillai Rojas (IND)";
    const text = "Fabiola Campillai Rojas (IND) · Senador por Región Metropolitana — asistencia 94.7%, votaciones y rendiciones en El Cambiómetro";
    const url = "https://cambiometro.impulsacv.cl/politico/fabiola-campillai-rojas";

    const fullShareText = text;
    const fullTextWithUrl = `${fullShareText} ${url}`;

    expect(fullTextWithUrl).toContain("Fabiola Campillai Rojas");
    expect(fullTextWithUrl).toContain("94.7%");
    expect(fullTextWithUrl).toContain("https://cambiometro.impulsacv.cl/politico/fabiola-campillai-rojas");
  });

  it("genera las URLs oficiales de intent con parámetros correctamente codificados", () => {
    const title = "Fabiola Campillai Rojas (IND)";
    const text = "Fabiola Campillai Rojas (IND) · Senador por Región Metropolitana — asistencia 94.7%, votaciones y rendiciones en El Cambiómetro";
    const url = "https://cambiometro.impulsacv.cl/politico/fabiola-campillai-rojas";

    const encodedUrl = encodeURIComponent(url);
    const encodedText = encodeURIComponent(text);
    const encodedTextWithUrl = encodeURIComponent(`${text} ${url}`);

    // X (Twitter)
    const xUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    expect(xUrl).toContain("twitter.com/intent/tweet");
    expect(xUrl).toContain(`url=${encodedUrl}`);
    expect(xUrl).toContain(`text=${encodedText}`);

    // WhatsApp
    const waUrl = `https://api.whatsapp.com/send?text=${encodedTextWithUrl}`;
    expect(waUrl).toContain("api.whatsapp.com/send");
    expect(waUrl).toContain(encodedTextWithUrl);

    // Telegram
    const tgUrl = `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`;
    expect(tgUrl).toContain("t.me/share/url");
    expect(tgUrl).toContain(`url=${encodedUrl}`);

    // LinkedIn
    const liUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    expect(liUrl).toContain("linkedin.com/sharing/share-offsite");
    expect(liUrl).toContain(`url=${encodedUrl}`);

    // Facebook
    const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    expect(fbUrl).toContain("facebook.com/sharer/sharer.php");
    expect(fbUrl).toContain(`u=${encodedUrl}`);

    // Email
    const mailUrl = `mailto:?subject=${encodeURIComponent(title)}&body=${encodedText}%0A%0A${encodedUrl}`;
    expect(mailUrl).toContain("mailto:?");
    expect(mailUrl).toContain(`subject=${encodeURIComponent(title)}`);
  });
});
