const EMAIL_FALLBACK = "detrez.cedric@gmail.com";

document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('burger');
  const mobile = document.getElementById('mobile');
  if(burger && mobile){
    burger.addEventListener('click', () => mobile.classList.toggle('hidden'));
  }

  const form = document.getElementById('contactForm');
  if(!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const ok = document.getElementById('ok');
    const originalText = btn.textContent;
    btn.textContent = "Envoi...";
    btn.disabled = true;

    const data = {
      nom: document.getElementById('nom')?.value || '',
      tel: document.getElementById('tel')?.value || '',
      email: document.getElementById('email')?.value || '',
      sujet: document.getElementById('sujet')?.value || '',
      message: document.getElementById('message')?.value || ''
    };

    try {
      // Depuis pages/contact.html, contact.php est à la racine -> ../contact.php
      const res = await fetch('../contact.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const json = await res.json();
      if(json.ok){
        if(ok){
          ok.classList.remove('hidden');
          ok.innerHTML = "✅ Message reçu ! Je te recontacte vite au 07 83 20 87 86.<br><small class='text-xs'>Un mail vient de partir + sauvegarde dans data/demandes.json</small>";
        }
        form.reset();
      } else {
        alert(json.message || "Erreur lors de l'envoi");
      }
    } catch(err){
      console.error(err);
      alert("Erreur réseau. Appelle moi direct au 07 83 20 87 86");
    } finally {
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});
