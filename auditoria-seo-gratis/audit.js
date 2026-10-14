(function () {
  'use strict';
  var PSI_ENDPOINT = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  var PSI_KEY = 'AIzaSyBepPD766Pp4XcPq2CgHtn85x-huk0x7mQ';
  var FORM_ENDPOINT = 'https://formspree.io/f/mdajdpby';

  var $ = function (id) { return document.getElementById(id); };
  var tool = $('auditForm');
  var urlInput = $('auditUrl');
  var runBtn = $('auditRun');
  var statusEl = $('auditStatus');
  var results = $('auditResults');
  var leadForm = $('leadForm');
  var lastSummary = '';
  var lastUrl = '';

  function track(name, data) {
    var payload = { event: name };
    if (data) for (var k in data) payload[k] = data[k];
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(payload);
    if (typeof gtag === 'function') gtag('event', name, data || {});
  }

  function normalizeUrl(v) {
    v = (v || '').trim();
    if (!v) return null;
    if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
    try {
      var u = new URL(v);
      if (u.hostname.indexOf('.') < 0) return null;
      if (/^(localhost|127\.|10\.|192\.168\.|169\.254\.)/.test(u.hostname)) return null;
      return u.href;
    } catch (e) { return null; }
  }

  function setStatus(msg, kind) {
    statusEl.textContent = msg || '';
    statusEl.className = 'audit-status' + (kind ? ' is-' + kind : '');
  }

  function scoreColor(s) { return s >= 90 ? '#0b9d58' : s >= 50 ? '#d98a00' : '#d93a2b'; }

  function ring(label, score) {
    var wrap = document.createElement('div');
    wrap.className = 'audit-score';
    var circle = document.createElement('div');
    circle.className = 'audit-ring';
    var pct = Math.round(score * 100);
    circle.style.setProperty('--p', pct);
    circle.style.setProperty('--c', scoreColor(pct));
    var num = document.createElement('span');
    num.textContent = pct;
    circle.appendChild(num);
    var cap = document.createElement('div');
    cap.className = 'audit-score-label';
    cap.textContent = label;
    wrap.appendChild(circle);
    wrap.appendChild(cap);
    return wrap;
  }

  function metric(label, value) {
    var d = document.createElement('div');
    d.className = 'audit-metric';
    var v = document.createElement('strong');
    v.textContent = value || '—';
    var l = document.createElement('span');
    l.textContent = label;
    d.appendChild(v);
    d.appendChild(l);
    return d;
  }

  function listBlock(title, items, emptyMsg) {
    var box = document.createElement('div');
    box.className = 'audit-list';
    var h = document.createElement('h3');
    h.textContent = title;
    box.appendChild(h);
    if (!items.length) {
      var p = document.createElement('p');
      p.className = 'audit-ok';
      p.textContent = emptyMsg;
      box.appendChild(p);
      return box;
    }
    var ul = document.createElement('ul');
    items.forEach(function (t) { var li = document.createElement('li'); li.textContent = t; ul.appendChild(li); });
    box.appendChild(ul);
    return box;
  }

  function failing(lh, catId) {
    var cat = lh.categories[catId];
    if (!cat) return [];
    return cat.auditRefs
      .map(function (r) { return lh.audits[r.id]; })
      .filter(function (a) { return a && a.score !== null && a.score < 1 && a.scoreDisplayMode !== 'manual' && a.scoreDisplayMode !== 'notApplicable' && a.scoreDisplayMode !== 'informative'; })
      .map(function (a) { return a.title; });
  }

  function opportunities(lh) {
    return Object.keys(lh.audits).map(function (k) { return lh.audits[k]; })
      .filter(function (a) { return a.details && a.details.type === 'opportunity' && a.score !== null && a.score < 0.9 && a.details.overallSavingsMs > 200; })
      .sort(function (a, b) { return b.details.overallSavingsMs - a.details.overallSavingsMs; })
      .slice(0, 4)
      .map(function (a) { return a.title + ' (ahorro estimado: ' + (a.details.overallSavingsMs / 1000).toFixed(1).replace('.', ',') + ' s)'; });
  }

  function render(data) {
    var lh = data.lighthouseResult;
    var cats = lh.categories;
    var perf = Math.round(cats.performance.score * 100);
    var seo = Math.round(cats.seo.score * 100);
    var acc = Math.round(cats.accessibility.score * 100);
    var bp = Math.round(cats['best-practices'].score * 100);
    lastSummary = 'Rendimiento ' + perf + ' | SEO ' + seo + ' | Accesibilidad ' + acc + ' | Buenas prácticas ' + bp;
    lastUrl = lh.finalUrl || lastUrl;

    results.textContent = '';
    var head = document.createElement('div');
    head.className = 'audit-result-head';
    var t = document.createElement('h2');
    t.textContent = 'Resultado para ' + (lh.finalUrl || lastUrl).replace(/^https?:\/\//, '').replace(/\/$/, '');
    var sub = document.createElement('p');
    sub.textContent = 'Análisis en móvil con Google PageSpeed Insights (Lighthouse). Estas son las cuatro puntuaciones, de 0 a 100.';
    head.appendChild(t);
    head.appendChild(sub);
    results.appendChild(head);

    var scores = document.createElement('div');
    scores.className = 'audit-scores';
    scores.appendChild(ring('Rendimiento', cats.performance.score));
    scores.appendChild(ring('SEO técnico', cats.seo.score));
    scores.appendChild(ring('Accesibilidad', cats.accessibility.score));
    scores.appendChild(ring('Buenas prácticas', cats['best-practices'].score));
    results.appendChild(scores);

    var m = document.createElement('div');
    m.className = 'audit-metrics';
    var A = lh.audits;
    m.appendChild(metric('Primer contenido (FCP)', A['first-contentful-paint'] && A['first-contentful-paint'].displayValue));
    m.appendChild(metric('Contenido principal (LCP)', A['largest-contentful-paint'] && A['largest-contentful-paint'].displayValue));
    m.appendChild(metric('Estabilidad visual (CLS)', A['cumulative-layout-shift'] && A['cumulative-layout-shift'].displayValue));
    m.appendChild(metric('Bloqueo total (TBT)', A['total-blocking-time'] && A['total-blocking-time'].displayValue));
    results.appendChild(m);

    var cols = document.createElement('div');
    cols.className = 'audit-cols';
    cols.appendChild(listBlock('Qué falla en el SEO técnico', failing(lh, 'seo').slice(0, 6), 'No se han detectado fallos básicos de SEO técnico. Buen punto de partida.'));
    cols.appendChild(listBlock('Qué mejorar primero en velocidad', opportunities(lh), 'No hay mejoras de velocidad importantes pendientes.'));
    results.appendChild(cols);

    var accFails = failing(lh, 'accessibility').length;
    var note = document.createElement('p');
    note.className = 'audit-note';
    note.textContent = (accFails ? 'Accesibilidad: ' + accFails + ' puntos a revisar. ' : '') + 'Esta herramienta mide la base técnica. No analiza tu posicionamiento, tus competidores, tus enlaces ni cómo te ven ChatGPT o Perplexity: eso lo incluye la auditoría completa.';
    results.appendChild(note);

    var cta = document.createElement('div');
    cta.className = 'audit-after';
    var p = document.createElement('p');
    p.textContent = 'Si quieres el informe completo con un plan de acción priorizado, te lo preparo gratis.';
    var a = document.createElement('a');
    a.href = '#informe';
    a.className = 'btn-primary';
    a.textContent = 'Quiero el informe completo';
    cta.appendChild(p);
    cta.appendChild(a);
    results.appendChild(cta);

    results.hidden = false;
    var hu = $('hidUrl'), hr = $('hidResumen'), web = $('leadWeb');
    if (hu) hu.value = lastUrl;
    if (hr) hr.value = lastSummary;
    if (web && !web.value) web.value = lastUrl;
    track('audit_complete', { audit_perf: perf, audit_seo: seo });
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  var timer = null;
  var MSGS = ['Cargando tu web en un móvil de pruebas…', 'Midiendo velocidad y estabilidad…', 'Revisando el SEO técnico…', 'Comprobando accesibilidad y buenas prácticas…', 'Casi listo, Google está terminando el informe…'];

  function startProgress() {
    var i = 0;
    setStatus(MSGS[0], 'busy');
    timer = setInterval(function () { i = Math.min(i + 1, MSGS.length - 1); setStatus(MSGS[i], 'busy'); }, 7000);
  }
  function stopProgress() { if (timer) clearInterval(timer); timer = null; }

  async function run(url) {
    var qs = 'url=' + encodeURIComponent(url) + '&strategy=mobile&locale=es&category=performance&category=seo&category=accessibility&category=best-practices';
    if (PSI_KEY) qs += '&key=' + encodeURIComponent(PSI_KEY);
    var ctrl = new AbortController();
    var to = setTimeout(function () { ctrl.abort(); }, 90000);
    try {
      var res = await fetch(PSI_ENDPOINT + '?' + qs, { signal: ctrl.signal });
      var data = await res.json();
      if (!res.ok || data.error) {
        var msg = (data && data.error && data.error.message) || '';
        var reason = res.status === 429 ? 'cuota' : /FAILED_DOCUMENT_REQUEST|ERRORED_DOCUMENT_REQUEST|DNS_FAILURE|NOT_HTML|NO_FCP/.test(msg) ? 'url' : 'otro';
        throw { reason: reason, status: res.status };
      }
      return data;
    } finally { clearTimeout(to); }
  }

  if (tool) {
    tool.addEventListener('submit', async function (e) {
      e.preventDefault();
      var url = normalizeUrl(urlInput.value);
      if (!url) { setStatus('Escribe una dirección válida, por ejemplo tuempresa.es', 'error'); urlInput.focus(); return; }
      lastUrl = url;
      runBtn.disabled = true;
      runBtn.textContent = 'Analizando…';
      results.hidden = true;
      track('audit_start');
      startProgress();
      try {
        var data = await run(url);
        stopProgress();
        setStatus('');
        render(data);
      } catch (err) {
        stopProgress();
        var reason = err && err.reason ? err.reason : 'red';
        track('audit_error', { audit_reason: reason });
        if (reason === 'url') setStatus('Google no ha podido cargar esa dirección. Comprueba que está bien escrita y que la web es pública.', 'error');
        else if (reason === 'cuota') setStatus('El análisis automático está saturado ahora mismo. Pide la auditoría completa en el formulario de abajo y la reviso yo.', 'error');
        else setStatus('No se ha podido completar el análisis. Inténtalo de nuevo en un minuto o pide la auditoría completa en el formulario de abajo.', 'error');
      } finally {
        runBtn.disabled = false;
        runBtn.textContent = 'Analizar mi web';
      }
    });
  }

  if (leadForm) {
    var alertOk = $('leadOk'), alertErr = $('leadErr'), sendBtn = $('leadSend');
    leadForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      alertOk.hidden = true; alertErr.hidden = true;
      var name = $('leadName').value.trim(), mail = $('leadEmail').value.trim(), web = $('leadWeb').value.trim();
      if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) || !web || !$('leadConsent').checked) {
        alertErr.textContent = 'Revisa tu nombre, un email válido, la web y acepta la política de privacidad.';
        alertErr.hidden = false;
        return;
      }
      sendBtn.disabled = true; sendBtn.textContent = 'Enviando…';
      try {
        var res = await fetch(FORM_ENDPOINT, { method: 'POST', body: new FormData(leadForm), headers: { Accept: 'application/json' } });
        if (res.ok) {
          track('generate_lead', { lead_source: 'audit_tool' });
          alertOk.hidden = false;
          leadForm.reset();
        } else {
          alertErr.textContent = 'No se ha podido enviar. Escríbeme por WhatsApp al 630 780 358 o a hola@adrianmarquez.es.';
          alertErr.hidden = false;
        }
      } catch (err) {
        alertErr.textContent = 'Error de conexión. Escríbeme por WhatsApp al 630 780 358 o a hola@adrianmarquez.es.';
        alertErr.hidden = false;
      } finally {
        sendBtn.disabled = false; sendBtn.textContent = 'Pedir la auditoría completa';
      }
    });
  }
})();
