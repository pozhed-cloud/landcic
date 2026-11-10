(() => {
  if (['cicde.mx', 'www.cicde.mx'].includes(location.hostname)) {
    document.documentElement.classList.add('cicde-site');
  }

  const dataLayer = window.dataLayer = window.dataLayer || [];
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    if (link.matches('.js-wa')) dataLayer.push({ event: 'cicde_ads_whatsapp_click' });
    if (link.protocol === 'tel:') dataLayer.push({ event: 'cicde_ads_phone_click' });
  });

  const receiptKey = 'cicde_ads_extranjeros_recibido';
  const thanks = document.querySelector('[data-thanks-page]');
  if (thanks) {
    try {
      const receivedAt = Number(sessionStorage.getItem(receiptKey));
      sessionStorage.removeItem(receiptKey);
      if (receivedAt > 0 && Date.now() - receivedAt < 5 * 60 * 1000) {
        thanks.querySelector('h1').textContent = 'Gracias, recibimos tu caso';
        thanks.querySelector('.lead').textContent = 'Nuestro equipo revisará la información y te contactará por correo.';
        dataLayer.push({ event: 'cicde_ads_form_success' });
      }
    } catch {
      // The neutral page also works when the browser blocks session storage.
    }
    return;
  }

  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');

  if ('IntersectionObserver' in window && !motionPreference.matches) {
    const reveal = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          reveal.unobserve(entry.target);
        }
      }
    }, { threshold: .15 });
    document.querySelectorAll('.rv').forEach(element => reveal.observe(element));
  }

  const quotes = document.querySelector('#testimonios');
  const quoteControls = document.querySelector('[data-quote-controls]');
  if (quotes && quoteControls) {
    const previous = quoteControls.querySelector('[data-quote-prev]');
    const next = quoteControls.querySelector('[data-quote-next]');
    function syncQuoteControls() {
      const remaining = quotes.scrollWidth - quotes.clientWidth - quotes.scrollLeft;
      previous.setAttribute('aria-disabled', String(quotes.scrollLeft <= 2));
      next.setAttribute('aria-disabled', String(remaining <= 2));
      quoteControls.hidden = quotes.scrollWidth - quotes.clientWidth <= 2;
    }
    function moveQuote(button, direction) {
      if (button.getAttribute('aria-disabled') === 'true') return;
      const [first, second] = quotes.children;
      const stride = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
      const behavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
      quotes.scrollBy({ left: direction * stride, behavior });
    }
    previous.addEventListener('click', () => moveQuote(previous, -1));
    next.addEventListener('click', () => moveQuote(next, 1));
    quotes.addEventListener('scroll', syncQuoteControls, { passive: true });
    window.addEventListener('resize', syncQuoteControls);
    syncQuoteControls();
  }

  const mobileBar = document.querySelector('.mobile-bar');
  const heroActions = document.querySelectorAll('.hero .cta-row');
  if (mobileBar && heroActions.length && 'IntersectionObserver' in window) {
    const visibleActions = new Set();
    const barObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) visibleActions.add(entry.target);
        else visibleActions.delete(entry.target);
      }
      mobileBar.toggleAttribute('hidden', visibleActions.size > 0);
    }, { threshold: .5, rootMargin: '-60px 0px -65px' });
    heroActions.forEach(action => barObserver.observe(action));
  }

  const form = document.querySelector('#form');
  if (!form) return;

  const fields = form.querySelector('#form-fields');
  const submit = form.querySelector('button[type="submit"]');
  const status = form.querySelector('#status');
  const params = new URLSearchParams(location.search);
  const endpoint = form.dataset.endpoint ? new URL(form.dataset.endpoint, location.href) : null;
  const ready = /^https?:$/.test(location.protocol) && endpoint?.origin === location.origin;
  const thankYou = new URL(form.dataset.thanks, location.href);

  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid']) {
    form.elements[key].value = (params.get(key) ?? '').slice(0, 255);
  }

  if (!ready) {
    const note = document.createElement('p');
    note.className = 'preview-note';
    note.textContent = 'Vista previa del formulario. Puedes probar los campos con datos de ejemplo.';
    form.prepend(note);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity() || submit.disabled) return;

    status.hidden = false;
    status.removeAttribute('data-error');
    if (!ready) {
      status.textContent = 'Los campos son válidos. El envío de esta vista previa está desactivado.';
      return;
    }

    const payload = new FormData(form);
    payload.set('aviso', 'on');
    submit.disabled = true;
    status.textContent = 'Enviando tu caso…';
    try {
      const response = await fetch(endpoint, { method: 'POST', body: payload, headers: { Accept: 'application/json' } });
      if (!response.ok || (await response.json()).success !== true) throw new Error('Envío sin confirmar');
    } catch {
      status.setAttribute('data-error', '');
      status.textContent = 'No pudimos confirmar el envío. Vuelve a intentarlo o escríbenos por WhatsApp.';
      submit.disabled = false;
      return;
    }

    status.textContent = 'Recibimos tu caso.';
    try {
      sessionStorage.setItem(receiptKey, String(Date.now()));
    } catch {
      dataLayer.push({ event: 'cicde_ads_form_success' });
    }
    location.assign(thankYou.href);
  });

  fields.disabled = false;
})();
