// Gestion du menu mobile
document.getElementById('burger')?.addEventListener('click', () => {
    document.getElementById('mobile').classList.toggle('hidden');
});

// Gestion du formulaire de contact (page contact.html)
const contactForm = document.getElementById('contactForm');

if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault(); // Empêche le rechargement brutal de la page
        
        // Constitution de l'objet de données
        const formData = {
            nom: document.getElementById('nom').value,
            tel: document.getElementById('tel').value,
            email: document.getElementById('email').value,
            sujet: document.getElementById('sujet').value,
            message: document.getElementById('message').value
        };

        try {
            // Envoi des données vers le script PHP
            const response = await fetch('contact.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.ok) {
                // Affichage du message de succès et réinitialisation des champs
                document.getElementById('ok').classList.remove('hidden');
                contactForm.reset();
                
                // Cache le message après 5 secondes
                setTimeout(() => {
                    document.getElementById('ok').classList.add('hidden');
                }, 5000);
            } else {
                alert('Une erreur est survenue côté serveur.');
            }
        } catch (error) {
            console.error('Erreur:', error);
            alert('Impossible de contacter le serveur. Veuillez réessayer.');
        }
    });
}
