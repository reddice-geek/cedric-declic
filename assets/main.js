document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const mobile = document.getElementById('mobile');
  if (burger && mobile) {
    burger.addEventListener('click', () => {
      mobile.classList.toggle('hidden');
      burger.setAttribute('aria-expanded', String(!mobile.classList.contains('hidden')));
    });
  }

  const form = document.getElementById('contactForm');
  if (!form) return;

  const ok = document.getElementById('ok');
  const errorBox = document.getElementById('formError');
  const btn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (ok) { ok.classList.add('hidden'); ok.textContent = ''; }
    if (errorBox) { errorBox.classList.add('hidden'); errorBox.textContent = ''; }

    const originalText = btn.textContent;
    btn.textContent = 'Envoi en cours…';
    btn.disabled = true;

    const data = {
      nom: document.getElementById('nom')?.value.trim() || '',
      tel: document.getElementById('tel')?.value.trim() || '',
      email: document.getElementById('email')?.value.trim() || '',
      sujet: document.getElementById('sujet')?.value || '',
      message: document.getElementById('message')?.value.trim() || ''
    };

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) {
        throw new Error(result.message || 'La demande n’a pas pu être envoyée.');
      }

      if (ok) {
        ok.textContent = '✅ Demande envoyée et enregistrée. Je vous recontacterai dès que possible.';
        ok.classList.remove('hidden');
      }
      form.reset();
    } catch (error) {
      if (errorBox) {
        errorBox.textContent = `${error.message || 'Erreur réseau.'} Vous pouvez aussi me joindre au 07 83 20 87 86.`;
        errorBox.classList.remove('hidden');
      } else {
        alert(`${error.message || 'Erreur réseau.'} Appelez le 07 83 20 87 86.`);
      }
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});
