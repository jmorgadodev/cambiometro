from pathlib import Path

from playwright.sync_api import sync_playwright


BASE_URL = "http://127.0.0.1:3000"
SCREENSHOT = Path(r"C:\Users\jorge\AppData\Local\Temp\cambiometro-mapa-municipalidades-local.png")
REGION_SCREENSHOT = Path(r"C:\Users\jorge\AppData\Local\Temp\cambiometro-mapa-municipalidades-region-local.png")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000}, device_scale_factor=1)
    console_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)

    page.goto(f"{BASE_URL}/municipalidades", wait_until="domcontentloaded", timeout=120_000)
    page.get_by_role("heading", name="Del país a la comuna").wait_for(timeout=30_000)
    page.wait_for_timeout(3000)
    cookie_banner = page.get_by_role("region", name="Preferencias de cookies")
    if cookie_banner.is_visible():
        cookie_banner.get_by_role("button", name="Rechazar").click()
    assert page.get_by_label("Indicador del mapa municipal").count() == 1
    help_text = page.locator(".municipal-map-help").inner_text()
    assert "Rueda acercar" in help_text
    assert "Chile completo" in page.locator(".municipal-map-inspector").inner_text()

    map_paths = page.locator(".municipal-map-canvas svg path")
    assert map_paths.count() >= 16, f"Se esperaban 16 regiones, se encontraron {map_paths.count()} paths"
    map_canvas = page.locator(".municipal-map-canvas")
    map_canvas.scroll_into_view_if_needed()
    zoom_target = map_paths.nth(8)
    zoom_before = zoom_target.get_attribute("transform")
    canvas_bounds = map_canvas.bounding_box()
    assert canvas_bounds is not None, "No se pudo calcular el área del mapa"
    page.mouse.move(canvas_bounds["x"] + canvas_bounds["width"] / 2, canvas_bounds["y"] + canvas_bounds["height"] / 2)
    page.mouse.wheel(0, -500)
    page.wait_for_timeout(400)
    zoom_after = zoom_target.get_attribute("transform")
    assert zoom_before != zoom_after, "La rueda del ratón no modificó el zoom del mapa"
    page.screenshot(path=str(SCREENSHOT), full_page=True)

    clickable_path = map_paths.nth(8)
    assert clickable_path is not None, "No hay una región visible para seleccionar"
    clickable_path.scroll_into_view_if_needed()
    bounds = clickable_path.bounding_box()
    assert bounds is not None, "No se pudo calcular el área de una región"
    click_point = page.evaluate(
        """({box}) => {
          for (let y = box.y + 2; y < box.y + box.height - 2; y += 4) {
            for (let x = box.x + 2; x < box.x + box.width - 2; x += 4) {
              const element = document.elementFromPoint(x, y);
              if (element?.tagName?.toLowerCase() === "path") return { x, y };
            }
          }
          return null;
        }""",
        {"box": bounds},
    )
    assert click_point is not None, "No se encontró un punto interactivo dentro de la región"
    page.mouse.click(click_point["x"], click_point["y"])
    page.get_by_text("Región seleccionada").wait_for(timeout=10_000)
    assert page.get_by_text("Comunas de la región").count() == 1
    assert page.locator("a[href^='/municipalidades/']").count() > 0
    page.screenshot(path=str(REGION_SCREENSHOT), full_page=True)
    assert not console_errors, f"Errores de consola: {console_errors}"

    print({
        "url": page.url,
        "mapPaths": map_paths.count(),
        "regionSelected": True,
        "communeLinks": page.locator("a[href^='/municipalidades/']").count(),
        "screenshot": str(SCREENSHOT),
        "regionScreenshot": str(REGION_SCREENSHOT),
    })
    browser.close()
