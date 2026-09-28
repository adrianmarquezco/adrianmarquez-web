(function () {
  const form = document.getElementById('retiroForm');
  const submitBtn = document.getElementById('rfSubmitBtn');
  const alertError = document.getElementById('rfAlertError');
  const alertSuccess = document.getElementById('rfAlertSuccess');

  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    alertError.classList.remove('visible');
    alertSuccess.classList.remove('visible');

    const nombre = form.querySelector('#rf-nombre').value.trim();
    const email = form.querySelector('#rf-email').value.trim();
    const consent = form.querySelector('#rf-consent').checked;

    if (!nombre) {
      alertError.textContent = 'Por favor escribe tu nombre.';
      alertError.classList.add('visible');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alertError.textContent = 'Por favor escribe un email válido.';
      alertError.classList.add('visible');
      return;
    }
    if (!consent) {
      alertError.textContent = 'Necesito tu consentimiento para avisarte del retiro.';
      alertError.classList.add('visible');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Enviando...';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        form.style.display = 'none';
        alertSuccess.textContent = '¡Perfecto! Te he apuntado a la lista. Te aviso en cuanto haya novedades.';
        alertSuccess.classList.add('visible');
        if (window.dataLayer) window.dataLayer.push({ event: 'retiro_waitlist_signup' });
        if (typeof gtag !== 'undefined') gtag('event', 'retiro_waitlist_signup');
      } else {
        throw new Error();
      }
    } catch {
      alertError.textContent = 'Algo ha fallado. Escríbeme directamente a hola@adrianmarquez.es o por WhatsApp.';
      alertError.classList.add('visible');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Quiero apuntarme →';
    }
  });
})();
