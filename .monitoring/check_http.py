#!/usr/bin/env python3
"""Vigilante HTTP · adrianmarquez.es · Nginx estático / Coolify"""

import gzip as gz
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

BASE    = "https://adrianmarquez.es"
TIMEOUT = 10
WARN_MS = 1500
FAIL_MS = 4000
WORKERS = 10

# Rutas que deben devolver 404/403 (FAIL si devuelven 200)
MUST_404 = [
    "/.git/config",
    "/nginx.conf",
    "/.env",
    "/.gitattributes",
    "/README.md",
    "/n8n/comarca-mundial-instagram-fichajes.json",
    "/.monitoring/check_http.py",
    "/.monitoring/check_browser.py",
    "/.claude/settings.json",
]

SEC_HEADERS = [
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "strict-transport-security",
    "referrer-policy",
]

RX_BROKEN = re.compile(
    r'\[object\s+Object\]|\{\{[^}]{0,30}\}\}|\bNaN\b|TypeError:\s|ReferenceError:\s'
)

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


# ── HTTP helpers ──────────────────────────────────────────────────────────────

class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url, code, msg, headers, fp)


_opener         = urllib.request.build_opener()
_opener_noredir = urllib.request.build_opener(_NoRedirect())

_UA = "vigilante/1.0 (+https://adrianmarquez.es)"


def _fetch(url: str, *, method: str = "GET", follow: bool = True,
           timeout: int = TIMEOUT, extra_headers: dict = None):
    """(status, headers_lower, body, latency_ms, final_url)"""
    hdrs = {"User-Agent": _UA}
    if extra_headers:
        hdrs.update(extra_headers)
    req = urllib.request.Request(url, method=method, headers=hdrs)
    opener = _opener if follow else _opener_noredir
    t0 = time.monotonic()
    try:
        with opener.open(req, timeout=timeout) as r:
            body = r.read()
            ms   = (time.monotonic() - t0) * 1000
            rh   = {k.lower(): v for k, v in r.headers.items()}
            return r.status, rh, body, ms, r.url
    except urllib.error.HTTPError as e:
        ms = (time.monotonic() - t0) * 1000
        rh = {k.lower(): v for k, v in e.headers.items()}
        return e.code, rh, b"", ms, url
    except Exception:
        ms = (time.monotonic() - t0) * 1000
        return 0, {}, b"", ms, url


def _decode(body: bytes, hdrs: dict) -> str:
    enc = hdrs.get("content-encoding", "")
    if "gzip" in enc:
        try:
            body = gz.decompress(body)
        except Exception:
            pass
    return body.decode("utf-8", errors="replace")


# ── HTML parser ───────────────────────────────────────────────────────────────

class _PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self._in_title = False
        self.h1s: list = []
        self._h1 = ""
        self._in_h1 = False
        self.canonical = ""
        self.meta_desc = ""
        self.jsonld: list = []
        self._jld = ""
        self._in_jld = False
        self.resources: list = []  # (kind, url)

    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "title":
            self._in_title = True
        elif tag == "h1":
            self._in_h1 = True
        elif tag == "link":
            rel  = d.get("rel", "")
            href = d.get("href", "")
            if rel == "canonical":
                self.canonical = href
            elif rel == "stylesheet" and href:
                self.resources.append(("css", href))
        elif tag == "meta" and d.get("name", "").lower() == "description":
            self.meta_desc = d.get("content", "")
        elif tag == "img":
            src = d.get("src", "")
            if src and not src.startswith("data:"):
                self.resources.append(("img", src))
        elif tag == "script":
            if d.get("type") == "application/ld+json":
                self._in_jld = True
                self._jld = ""
            elif d.get("src"):
                self.resources.append(("js", d["src"]))

    def handle_endtag(self, tag):
        if tag == "title":
            self._in_title = False
        elif tag == "h1":
            self.h1s.append(self._h1.strip())
            self._h1 = ""
            self._in_h1 = False
        elif tag == "script" and self._in_jld:
            self.jsonld.append(self._jld)
            self._in_jld = False
            self._jld = ""

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        if self._in_h1:
            self._h1 += data
        if self._in_jld:
            self._jld += data


# ── Page check ────────────────────────────────────────────────────────────────

def _check_page(url: str, deep: bool = True) -> list:
    status, hdrs, body, ms, _ = _fetch(url)
    path = url.replace(BASE, "") or "/"

    if status == 0:
        fail(f"{path} → sin respuesta")
        return []
    if status != 200:
        fail(f"{path} → HTTP {status}")
        return []

    if ms > FAIL_MS:
        fail(f"{path} → {ms:.0f} ms (límite {FAIL_MS:.0f} ms)")
    elif ms > WARN_MS:
        warn(f"{path} → {ms:.0f} ms (>1.5 s)")

    ct = hdrs.get("content-type", "")
    if "text/html" not in ct:
        fail(f"{path} → Content-Type inesperado: {ct}")
        return []

    if not deep:
        ok(f"{path} → {status} {ms:.0f}ms")
        return []

    text = _decode(body, hdrs)
    p = _PageParser()
    try:
        p.feed(text)
    except Exception:
        pass

    title = p.title.strip()
    if not title:
        fail(f"{path} → sin <title>")
    elif any(w in title.lower() for w in ("error", "404", "not found", "undefined", "503")):
        fail(f"{path} → título de error: {title!r}")

    n_h1 = len(p.h1s)
    if n_h1 == 0:
        fail(f"{path} → sin H1")
    elif n_h1 > 1:
        fail(f"{path} → {n_h1} H1s (debe ser 1): {p.h1s}")

    if not p.canonical:
        warn(f"{path} → sin canonical")
    else:
        canon    = p.canonical.rstrip("/")
        expected = url.rstrip("/")
        if canon not in (expected, path.rstrip("/")):
            warn(f"{path} → canonical inesperado: {p.canonical}")

    if not p.meta_desc:
        warn(f"{path} → sin meta description")

    m = RX_BROKEN.search(text)
    if m:
        snippet = text[max(0, m.start() - 20): m.end() + 20].replace("\n", " ")
        warn(f"{path} → texto roto: …{snippet}…")

    for jld in p.jsonld:
        try:
            json.loads(jld)
        except json.JSONDecodeError as e:
            fail(f"{path} → JSON-LD inválido: {e}")

    ok(f"{path} → {status} {ms:.0f}ms | {title[:50]!r}")
    return p.resources


# ── Resource check ────────────────────────────────────────────────────────────

def _check_resource(page_url: str, kind: str, res_url: str) -> None:
    if not res_url:
        return
    if res_url.startswith("http"):
        if not res_url.startswith(BASE):
            return
        full = res_url
    else:
        full = urllib.parse.urljoin(page_url, res_url)

    if not full.startswith(BASE):
        return

    status, _, _, _, _ = _fetch(full, method="HEAD")
    path = full.replace(BASE, "")
    if status in (0, 404, 410):
        fail(f"recurso {kind} roto → {path} ({status})")
    elif status not in (200, 206, 301, 302, 304):
        warn(f"recurso {kind} → {path} devuelve {status}")


# ── Sitemap parser ────────────────────────────────────────────────────────────

def _parse_sitemap(xml_bytes: bytes) -> list:
    ns   = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.fromstring(xml_bytes)
    return [loc.text.strip() for loc in root.findall(".//sm:loc", ns) if loc.text]


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"=== Vigilante HTTP · {BASE} ===\n")

    # 1. sitemap.xml
    st, _, sxml, ms, _ = _fetch(f"{BASE}/sitemap.xml")
    if st != 200:
        fail(f"/sitemap.xml → HTTP {st}")
    else:
        ok(f"/sitemap.xml → 200 {ms:.0f}ms")

    # 2. robots.txt
    st, _, _, ms, _ = _fetch(f"{BASE}/robots.txt")
    if st != 200:
        fail(f"/robots.txt → HTTP {st}")
    else:
        ok(f"/robots.txt → 200 {ms:.0f}ms")

    # 3. 404 real
    st, _, _, _, _ = _fetch(f"{BASE}/__vigilante_404_test__")
    if st == 200:
        fail("URL inexistente devuelve 200 (se esperaba 404)")
    elif st == 404:
        ok("404 real → OK")
    else:
        warn(f"URL inexistente → HTTP {st} (esperado 404)")

    # 4. Archivos privados
    print("\n-- Archivos privados (deben dar 404/403) --")
    for path in MUST_404:
        st, _, _, _, _ = _fetch(f"{BASE}{path}")
        if st == 200:
            fail(f"PRIVADO ACCESIBLE: {path} → 200")
        elif st in (401, 403):
            ok(f"{path} → {st} (bloqueado)")
        else:
            ok(f"{path} → {st}")

    # 5. Cabeceras de seguridad
    print("\n-- Cabeceras de seguridad --")
    _, hdrs, _, _, _ = _fetch(BASE)
    for h in SEC_HEADERS:
        if h not in hdrs:
            warn(f"Cabecera ausente: {h}")
        else:
            ok(f"{h}: presente")

    # 6. Compresión
    _, hdrs_gz, _, _, _ = _fetch(BASE, extra_headers={"Accept-Encoding": "gzip, deflate"})
    enc = hdrs_gz.get("content-encoding", "")
    if enc:
        ok(f"Compresión: {enc}")
    else:
        warn("Sin compresión (Content-Encoding ausente en respuesta a Accept-Encoding: gzip)")

    # 7. Redirecciones
    print("\n-- Redirecciones --")
    st, rh, _, _, _ = _fetch("http://adrianmarquez.es/", follow=False)
    loc = rh.get("location", "")
    if st == 301 and loc.startswith("https"):
        ok(f"http → https: 301 OK → {loc}")
    elif st in (302, 307, 308):
        warn(f"http → https: {st} en vez de 301 (SEO: usar 301)")
    elif st == 200:
        fail("http no redirige a https")
    else:
        ok(f"http → {st}")

    try:
        st, rh2, _, _, _ = _fetch("https://www.adrianmarquez.es/", follow=False, timeout=6)
        loc2 = rh2.get("location", "")
        if st in (301, 302) and "www" not in loc2:
            ok(f"www → sin www: {st} OK")
        elif st == 200:
            warn("www.adrianmarquez.es devuelve 200 sin redirigir")
        else:
            ok(f"www → {st} {loc2[:60]}")
    except Exception:
        warn("www.adrianmarquez.es sin respuesta (sin registro DNS, puede ser correcto)")

    # 8. URLs del sitemap
    print("\n-- URLs del sitemap --")
    try:
        urls = _parse_sitemap(sxml)
    except Exception as e:
        fail(f"sitemap.xml no parseable: {e}")
        urls = []

    print(f"Total URLs: {len(urls)}")
    deep_urls  = urls[:60]   # Primeras 60: comprobación completa
    light_urls = urls[60:]   # El resto: solo status y latencia

    page_resources: dict = {}
    with ThreadPoolExecutor(max_workers=WORKERS) as ex:
        fmap = {ex.submit(_check_page, u, True):  u for u in deep_urls}
        fmap.update({ex.submit(_check_page, u, False): u for u in light_urls})
        for f in as_completed(fmap):
            url = fmap[f]
            try:
                res = f.result()
                if res:
                    page_resources[url] = res
            except Exception as e:
                fail(f"Error procesando {url}: {e}")

    # 9. Recursos propios (CSS, JS, imágenes)
    print(f"\n-- Recursos propios --")
    seen: set = set()
    tasks: list = []
    for page_url, resources in page_resources.items():
        for kind, res_url in resources:
            if kind in ("css", "js", "img"):
                key = (kind, res_url)
                if key not in seen:
                    seen.add(key)
                    tasks.append((page_url, kind, res_url))

    print(f"Recursos únicos a verificar: {len(tasks)}")
    with ThreadPoolExecutor(max_workers=20) as ex:
        fs = [ex.submit(_check_resource, p, k, r) for p, k, r in tasks]
        for f in as_completed(fs):
            try:
                f.result()
            except Exception as e:
                warn(f"Error comprobando recurso: {e}")

    # Resumen
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
