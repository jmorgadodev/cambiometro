/**
 * El Cambiómetro — widget embebible conectado a la API pública.
 * <script src="https://cambiometro.impulsacv.cl/widget.js" data-politico="dip-061"></script>
 */
(function () {
  const scripts = document.querySelectorAll("script[data-politico]");

  scripts.forEach(function (script) {
    const politicoId = script.getAttribute("data-politico");
    if (!politicoId || script.getAttribute("data-loaded")) return;
    script.setAttribute("data-loaded", "true");

    const origin = script.getAttribute("data-api-origin") || new URL(script.src, document.baseURI).origin;
    const host = document.createElement("div");
    host.className = "transparencia-widget";
    host.setAttribute("aria-live", "polite");
    script.parentNode.insertBefore(host, script.nextSibling);

    const root = host.attachShadow ? host.attachShadow({ mode: "open" }) : host;
    const style = document.createElement("link");
    style.rel = "stylesheet";
    style.href = new URL("widget.css", script.src).href;
    style.crossOrigin = "anonymous";
    root.appendChild(style);

    const card = document.createElement("article");
    card.className = "card";
    card.textContent = "Consultando ficha pública…";
    root.appendChild(card);

    fetch(origin + "/api/v1/politico/" + encodeURIComponent(politicoId))
      .then(function (response) {
        if (!response.ok) throw new Error("Ficha HTTP " + response.status);
        return response.json();
      })
      .then(function (payload) {
        const politico = payload.data;
        const evidenceCount = (politico.evidencia || []).reduce(function (total, source) {
          return total + (source.records || []).length;
        }, 0);

        card.textContent = "";
        const eyebrow = document.createElement("div");
        eyebrow.className = "eyebrow";
        eyebrow.textContent = "El Cambiómetro";
        const name = document.createElement("h2");
        name.className = "name";
        name.textContent = politico.nombre_completo;
        const meta = document.createElement("div");
        meta.className = "meta";
        meta.textContent = [politico.cargo, politico.partido && politico.partido.sigla, politico.distrito_region].filter(Boolean).join(" · ");
        const status = document.createElement("div");
        status.className = "status";
        const snapshotDate = payload.meta && payload.meta.snapshot_etl && payload.meta.snapshot_etl.generatedAtChile
          ? payload.meta.snapshot_etl.generatedAtChile
          : (payload.meta && (payload.meta.checkedAt || payload.meta.generatedAt)) || "sin fecha";
        status.textContent = evidenceCount + " registros ETL asociados · corte " + snapshotDate;
        const link = document.createElement("a");
        link.href = politico.url_ficha;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Abrir ficha y fuentes →";
        card.append(eyebrow, name, meta, status, link);
      })
      .catch(function () {
        card.classList.add("error");
        card.textContent = "No fue posible cargar esta ficha pública.";
      });
  });
})();
