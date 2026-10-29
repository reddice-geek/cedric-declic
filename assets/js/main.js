
const EMAIL_FALLBACK = "detrez.cedric@gmail.com";

document.addEventListener("DOMContentLoaded", () => {
    // Menu mobile
    const burger = document.getElementById("burger");
    const mobile = document.getElementById("mobile");

    if (burger && mobile) {
        burger.addEventListener("click", () => {
            mobile.classList.toggle("hidden");
        });
    }

    // Formulaire de contact
    const form = document.getElementById("contactForm");

    // Certaines pages n'ont pas de formulaire.
    if (!form) return;

    // Éviter d'envoyer le formulaire deux fois avec deux gestionnaires.
    if (form.dataset.contactHandlerAttached === "true") return;
    form.dataset.contactHandlerAttached = "true";

    const btn = form.querySelector('button[type="submit"]');
    const ok = document.getElementById("ok");
    const errorDiv = document.getElementById("formError");

    if (!btn) {
        console.error("Bouton d'envoi du formulaire introuvable.");
        return;
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        if (btn.disabled) return;

        if (ok) {
            ok.classList.add("hidden");
            ok.textContent = "";
        }

        if (errorDiv) {
            errorDiv.classList.add("hidden");
            errorDiv.textContent = "";
        }

        const originalText = btn.textContent;

        btn.textContent = "Envoi en cours...";
        btn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            // Appel à l'API Vercel, et non à contact.php.
            const res = await fetch("/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(data)
            });

            const json = await res.json().catch(() => null);

            // L'API doit confirmer explicitement l'enregistrement.
            if (!res.ok || !json || json.success !== true) {
                throw new Error(
                    json?.error ||
                    json?.message ||
                    `Erreur du serveur (HTTP ${res.status}).`
                );
            }

            if (ok) {
                ok.textContent =
                    "✅ Merci ! Ta demande a bien été enregistrée. Je te recontacterai au plus vite.";
                ok.classList.remove("hidden");
            } else {
                alert("Demande enregistrée avec succès !");
            }

            form.reset();

        } catch (err) {
            console.error("Erreur d'envoi du formulaire :", err);

            const message =
                err.message ||
                "Impossible de confirmer l'enregistrement de ta demande.";

            if (errorDiv) {
                errorDiv.textContent =
                    `${message} Tu peux aussi me joindre au 07 83 20 87 86.`;
                errorDiv.classList.remove("hidden");
            } else {
                alert(
                    `${message}\nTu peux aussi me joindre au 07 83 20 87 86.`
                );
            }

        } finally {
            btn.textContent = originalText || "Envoyer la demande";
            btn.disabled = false;
        }
    });
});
