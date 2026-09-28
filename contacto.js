(function () {
  const FORM_ENDPOINT = 'https://formspree.io/f/mdajdpby';
  const form = document.getElementById('contactForm');
  const submitBtn = document.getElementById('formSubmitBtn');
  const alertError = document.getElementById('formAlertError');
  const alertSuccess = document.getElementById('formAlertSuccess');

  let formStartFired = false;
  function fireFormStart() {
    if (formStartFired) return;
    formStartFired = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ event: 'form_start' });
    if (typeof gtag === 'function') gtag('event', 'form_start');
  }
  form.addEventListener('focusin', fireFormStart);

  const fieldMap = { nombre: 'fname', email: 'email', telefono: 'phone', mensaje: 'message' };

  function showFieldError(fieldId, msg) {
    const input = document.getElementById(fieldId);
    const err = document.getElementById('error-' + fieldId);
    if (input) input.classList.add('is-error');
    if (err) { err.textContent = msg; err.classList.add('visible'); }
  }

  function clearErrors() {
    form.querySelectorAll('.is-error').forEach(el => el.classList.remove('is-error'));
    form.querySelectorAll('.form-error-msg').forEach(el => { el.textContent = ''; el.classList.remove('visible'); });
    alertError.classList.remove('visible');
    alertError.textContent = '';
    alertSuccess.classList.remove('visible');
    alertSuccess.textContent = '';
  }

  function validate() {
    let valid = true;
    const name = document.getElementById('fname').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const msg = document.getElementById('message').value.trim();

    if (!name) { showFieldError('fname', 'Indica tu nombre.'); valid = false; }
    if (!email && !phone) {
      const contactErr = document.getElementById('error-contact');
      contactErr.textContent = 'Indica un email o teléfono para poder responderte.';
      contactErr.classList.add('visible');
      document.getElementById('email').classList.add('is-error');
      document.getElementById('phone').classList.add('is-error');
      valid = false;
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFieldError('email', 'Introduce un email válido.');
      valid = false;
    }
    if (!msg) { showFieldError('message', 'Cuéntame brevemente tu proyecto o consulta.'); valid = false; }
    if (!document.getElementById('consent').checked) { showFieldError('consent', 'Debes aceptar la política de privacidad para continuar.'); valid = false; }
    return valid;
  }

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    clearErrors();
    if (!validate()) {
      alertError.textContent = 'Revisa los campos marcados antes de enviar.';
      alertError.classList.add('visible');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando…';

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: 'generate_lead' });
        if (typeof gtag === 'function') gtag('event', 'generate_lead');
        alertSuccess.textContent = '✓ Mensaje recibido. Te responderé en menos de 24 horas laborables.';
        alertSuccess.classList.add('visible');
        form.reset();
        document.querySelectorAll('.form-cpref-btn').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
        const pref = document.getElementById('contactPrefVal');
        if (pref) pref.value = '';
      } else if (data.errors && data.errors.length) {
        data.errors.forEach(function (err) {
          const id = fieldMap[err.field] || err.field;
          if (document.getElementById('error-' + id) || document.getElementById(id)) showFieldError(id, err.message || 'Revisa este campo.');
        });
        alertError.textContent = data.error || 'No se pudo enviar. Revisa los campos e inténtalo de nuevo.';
        alertError.classList.add('visible');
      } else {
        alertError.textContent = data.error || 'Error al enviar. Inténtalo de nuevo o escríbeme por WhatsApp al 630 780 358.';
        alertError.classList.add('visible');
      }
    } catch {
      alertError.textContent = 'Error de conexión. Comprueba tu red o escríbeme directamente por WhatsApp.';
      alertError.classList.add('visible');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar mensaje →';
    }
  });

  document.getElementById('consent').addEventListener('change', function () {
    this.classList.remove('is-error');
    const err = document.getElementById('error-consent');
    if (err) { err.classList.remove('visible'); err.textContent = ''; }
  });

  ['fname', 'email', 'phone', 'message'].forEach(function (id) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () {
      el.classList.remove('is-error');
      const err = document.getElementById('error-' + id);
      if (err) { err.classList.remove('visible'); err.textContent = ''; }
      document.getElementById('error-contact').classList.remove('visible');
    });
  });

  document.querySelectorAll('.form-cpref-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.form-cpref-btn').forEach(function (b) { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      document.getElementById('contactPrefVal').value = btn.dataset.val;
    });
  });

  const params = new URLSearchParams(window.location.search);
  const servicio = params.get('servicio');
  const ubicacion = params.get('ubicacion');
  let shouldScroll = false;
  if (servicio) {
    const sel = document.getElementById('service');
    const opt = sel.querySelector('option[value="' + servicio + '"]');
    if (opt) { sel.value = servicio; shouldScroll = true; }
  }
  if (ubicacion) {
    const msg = document.getElementById('message');
    if (msg && !msg.value) {
      msg.value = 'Ubicación: ' + ubicacion + '\n\n';
      msg.setSelectionRange(msg.value.length, msg.value.length);
    }
    shouldScroll = true;
  }
  if (shouldScroll) {
    const formEl = document.getElementById('contacto-form');
    if (formEl) requestAnimationFrame(function () { formEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }
})();
