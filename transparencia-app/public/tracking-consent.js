(function () {
  "use strict";

  var script = document.currentScript;
  var id = script && script.getAttribute("data-ga4-id");
  var consentKey = "cambiometro-consent";
  var consentEvent = "cambiometro:consent-changed";
  var loaded = false;
  var lastPath = "";

  if (!id || !/^G-[A-Z0-9_-]+$/i.test(id)) return;

  function consentGranted() {
    try {
      return window.localStorage.getItem(consentKey) === "granted";
    } catch (_) {
      return false;
    }
  }

  function dataLayer() {
    window.dataLayer = Array.isArray(window.dataLayer) ? window.dataLayer : [];
    window.gtag = window.gtag || function () {
      window.dataLayer.push(arguments);
    };
    return window.dataLayer;
  }

  function pageView() {
    if (!loaded || !window.gtag) return;
    var path = window.location.pathname + window.location.search;
    if (path === lastPath) return;
    lastPath = path;
    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: path
    });
  }

  function load() {
    if (loaded || !consentGranted()) return;
    var layer = dataLayer();
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      wait_for_update: 500
    });
    var tag = document.createElement("script");
    tag.async = true;
    tag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(id);
    tag.setAttribute("data-cambiometro-tracker", "ga4");
    document.head.appendChild(tag);
    window.__cambiometroTracking = { mode: "ga4", id: id };
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted"
    });
    window.gtag("js", new Date());
    window.gtag("config", id, { anonymize_ip: true, send_page_view: false });
    loaded = true;
    pageView();
    layer.push({ event: "cambiometro_tracking_ready", measurement_id: id });
  }

  window.addEventListener(consentEvent, load);
  window.addEventListener("popstate", pageView);
  var pushState = history.pushState;
  history.pushState = function () {
    var result = pushState.apply(this, arguments);
    window.dispatchEvent(new Event("cambiometro:navigation"));
    return result;
  };
  window.addEventListener("cambiometro:navigation", pageView);
  load();
})();
