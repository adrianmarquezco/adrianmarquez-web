#!/usr/bin/env python3
"""Vigilante navegador · adrianmarquez.es · Playwright"""

import os
import sys
import time

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    print("SKIP  Playwright no instalado (pip install playwright)", flush=True)
    sys.exit(0)

BASE       = "https://adrianmarquez.es"
PW_CHANNEL = os.environ.get("PW_CHANNEL", "")  # "msedge" / "chrome" / "" (chromium)

VIEWPORTS = [
    {"name": "mobile",  "width": 375,  "height": 812},
    {"name": "desktop", "width": 1366, "height": 768},
]

WARN_LCP  = 4000   # ms
FAIL_LCP  = 8000
WARN_CLS  = 0.1
FAIL_LOAD = 9000   # ms

_errors: list = []
_warnings: list = []


def fail(msg: str) -> None:
    _errors.append(msg)
    print(f"FAIL  {msg}", flush=True)


def warn(msg: str) -> None:
    _warnings.append(msg)
    print(f"WARN  {msg}", flush=True)


def ok(msg: str) -> None:
    print(f"PASS  {msg}", flush=True)


# ── Web Vitals ────────────────────────────────────────────────────────────────

_VITALS_JS = """() => new Promise(resolve => {
    const v = { lcp: null, cls: 0 };
    let cls = 0;
    try {
        new PerformanceObserver(l => {
            const e = l.getEntries();
            if (e.length) v.lcp = e[e.length - 1].startTime;
        }).observe({ type: 'largest-contentful-paint', buffered: true });
    } catch(e) {}
    try {
        new PerformanceObserver(l => {
            for (const e of l.getEntries())
                if (!e.hadRecentInput) cls += e.value;
            v.cls = cls;
        }).observe({ type: 'layout-shift', buffered: true });
    } catch(e) {}
    setTimeout(() => { v.cls = cls; resolve(v); }, 2500);
})"""


# ── Page check ────────────────────────────────────────────────────────────────

def check_page(page, url: str, vp: str) -> None:
    path  = url.replace(BASE, "") or "/"
    label = f"[{vp}] {path}"

    js_errors: list = []
    failed_res: list = []

    page.on("console",       lambda m: js_errors.append(m.text) if m.type == "error" else None)
    page.on("requestfailed", lambda r: failed_res.append(r.url) if r.url.startswith(BASE) else None)

    t0 = time.monotonic()
    try:
        resp = page.goto(url, wait_until="networkidle", timeout=15000)
    except Exception as e:
        fail(f"{label} → timeout / error de carga: {e}")
        return

    load_ms = (time.monotonic() - t0) * 1000

    status = resp.status if resp else 0
    if status != 200:
        fail(f"{label} → HTTP {status}")
        return

    if load_ms > FAIL_LOAD:
        fail(f"{label} → carga {load_ms:.0f} ms (límite {FAIL_LOAD} ms)")
    else:
        ok(f"{label} → cargada en {load_ms:.0f} ms")

    # Errores JS (filtrar ruido de GTM / extensiones)
    real_errors = [e for e in js_errors
                   if not any(x in e.lower() for x in ("gtm", "analytics", "extension", "adblock"))]
    if real_errors:
        fail(f"{label} → errores JS: {real_errors[:3]}")

    # Recursos propios fallidos
    if failed_res:
        fail(f"{label} → recursos propios fallidos: {failed_res[:5]}")

    # H1
    h1 = page.locator("h1").first
    if h1.count() == 0:
        fail(f"{label} → sin H1 en el DOM")
    elif not h1.is_visible():
        warn(f"{label} → H1 no visible")
    else:
        ok(f"{label} → H1: {h1.inner_text()[:50]!r}")

    # Header / nav
    if page.locator("header, nav").first.count() > 0:
        ok(f"{label} → header/nav presente")
    else:
        warn(f"{label} → sin header/nav detectado")

    # Footer
    if page.locator("footer").first.count() > 0:
        ok(f"{label} → footer presente")
    else:
        warn(f"{label} → sin footer detectado")

    # Imágenes rotas
    broken = page.evaluate("""() =>
        [...document.querySelectorAll('img')]
            .filter(i => !i.complete || i.naturalWidth === 0)
            .map(i => i.src)
            .filter(s => s && !s.startsWith('data:'))
            .slice(0, 5)
    """)
    if broken:
        fail(f"{label} → imágenes rotas: {broken}")
    else:
        ok(f"{label} → sin imágenes rotas")

    # Overflow horizontal
    overflow = page.evaluate(
        "() => document.documentElement.scrollWidth > window.innerWidth + 2"
    )
    if overflow:
        warn(f"{label} → desborde horizontal")
    else:
        ok(f"{label} → sin desborde horizontal")

    # Web Vitals
    try:
        v   = page.evaluate(_VITALS_JS)
        lcp = v.get("lcp")
        cls = v.get("cls", 0) or 0

        if lcp is not None:
            if lcp > FAIL_LCP:
                fail(f"{label} → LCP {lcp:.0f} ms (límite {FAIL_LCP} ms)")
            elif lcp > WARN_LCP:
                warn(f"{label} → LCP {lcp:.0f} ms (>4 s)")
            else:
                ok(f"{label} → LCP {lcp:.0f} ms")

        if cls > WARN_CLS:
            warn(f"{label} → CLS {cls:.3f} (>0.1)")
        else:
            ok(f"{label} → CLS {cls:.3f}")
    except Exception as e:
        warn(f"{label} → no se pudo medir Web Vitals: {e}")


# ── Nav check ─────────────────────────────────────────────────────────────────

def check_nav(page, vp: str) -> None:
    label = f"[{vp}] navegacion"
    try:
        page.goto(BASE + "/", wait_until="domcontentloaded", timeout=10000)
        # Click en el primer enlace de nav que no sea el logo
        links = page.locator("nav a, header a").filter(has_not_text="Adrián")
        first = links.first
        if first.count() > 0 and first.is_visible():
            text = first.inner_text()[:25]
            first.click()
            page.wait_for_load_state("domcontentloaded", timeout=6000)
            ok(f"{label} → click en '{text}' OK")
        else:
            warn(f"{label} → sin enlace de nav clicable visible")
    except Exception as e:
        warn(f"{label} → error al probar navegacion: {e}")


# ── Form check ────────────────────────────────────────────────────────────────

def check_form(page, url: str, vp: str) -> None:
    path  = url.replace(BASE, "")
    label = f"[{vp}] form {path}"
    try:
        page.goto(url, wait_until="domcontentloaded", timeout=10000)
        form = page.locator("form").first
        if form.count() == 0:
            warn(f"{label} → sin formulario en la página")
            return
        n = page.locator("form input:visible, form textarea:visible").count()
        if n == 0:
            warn(f"{label} → formulario sin campos visibles")
        else:
            ok(f"{label} → {n} campos visibles (sin enviar)")
    except Exception as e:
        warn(f"{label} → error comprobando formulario: {e}")


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"=== Vigilante Navegador · {BASE} ===\n")

    launch_kwargs: dict = {}
    if PW_CHANNEL:
        launch_kwargs["channel"] = PW_CHANNEL

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, **launch_kwargs)

        for vp in VIEWPORTS:
            print(f"\n-- Viewport: {vp['name']} ({vp['width']}x{vp['height']}) --")
            ctx  = browser.new_context(
                viewport={"width": vp["width"], "height": vp["height"]},
                user_agent="Mozilla/5.0 (compatible; vigilante/1.0)"
            )
            page = ctx.new_page()

            # Páginas principales
            for path in ["/", "/sobre-mi.html", "/servicios.html", "/contacto.html", "/retiro.html"]:
                check_page(page, BASE + path, vp["name"])

            # Navegacion
            check_nav(page, vp["name"])

            # Formularios (sin enviar)
            check_form(page, BASE + "/contacto.html", vp["name"])
            check_form(page, BASE + "/retiro.html",   vp["name"])

            ctx.close()

        browser.close()

    print(f"\n{'=' * 52}")
    print(f"Fallos:  {len(_errors)}")
    print(f"Avisos:  {len(_warnings)}")
    if _errors:
        print("\nFALLOS:")
        for e in _errors:
            print(f"  - {e}")
    if _warnings:
        print("\nAVISOS:")
        for w in _warnings:
            print(f"  - {w}")
    print("=" * 52)

    sys.exit(1 if _errors else 0)


if __name__ == "__main__":
    main()
