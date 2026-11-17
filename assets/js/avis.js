document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("reviewForm");
    const list = document.getElementById("reviewsList");
    const average = document.getElementById("averageRating");
    const averageStars = document.getElementById("averageStars");
    const count = document.getElementById("reviewCount");
    const loadError = document.getElementById("reviewLoadError");
    const success = document.getElementById("reviewSuccess");
    const errorBox = document.getElementById("reviewError");
    const submit = document.getElementById("reviewSubmit");

    if (!form || !list) return;

    const escapeDate = (value) => {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "Date non précisée";
        return new Intl.DateTimeFormat("fr-FR", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(date);
    };

    const makeElement = (tag, className, text) => {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    };

    function renderReviews(reviews) {
        const sorted = [...reviews].sort((a, b) => new Date(b.date) - new Date(a.date));
        list.replaceChildren();

        if (!sorted.length) {
            list.appendChild(makeElement(
                "div",
                "md:col-span-2 bg-white border border-slate-200 rounded-2xl p-7 text-center",
                "Aucun avis pour le moment. Votre retour sera peut-être le premier !"
            ));
            average.textContent = "—";
            averageStars.textContent = "☆☆☆☆☆";
            count.textContent = "Aucun avis publié";
            return;
        }

        const total = sorted.reduce((sum, review) => sum + Number(review.note || 0), 0);
        const mean = total / sorted.length;
        average.textContent = `${mean.toFixed(1).replace(".", ",")}/5`;
        averageStars.textContent = `${"★".repeat(Math.round(mean))}${"☆".repeat(5 - Math.round(mean))}`;
        averageStars.setAttribute("aria-label", `Note moyenne de ${mean.toFixed(1)} sur 5`);
        count.textContent = `${sorted.length} avis publié${sorted.length > 1 ? "s" : ""}`;

        sorted.forEach((review) => {
            const card = makeElement("article", "bg-white border border-slate-200 rounded-2xl p-5 shadow-sm");
            const header = makeElement("div", "flex items-start justify-between gap-3 flex-wrap");
            const identity = makeElement("div", "min-w-0");
            identity.appendChild(makeElement("h3", "font-bold text-slate-900 break-words", review.nom || "Client"));
            identity.appendChild(makeElement("p", "mt-1 text-xs text-slate-400", escapeDate(review.date)));
            header.appendChild(identity);
            const rating = Math.min(5, Math.max(1, Number(review.note) || 0));
            const stars = makeElement("div", "rating-stars text-amber-500 text-lg", `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`);
            stars.setAttribute("aria-label", `Note : ${rating} sur 5`);
            header.appendChild(stars);
            card.appendChild(header);

            if (review.prestation) {
                card.appendChild(makeElement("div", "inline-flex mt-4 bg-violet-50 text-violet-700 px-3 py-1 rounded-full text-xs font-semibold", review.prestation));
            }
            card.appendChild(makeElement("p", "mt-4 text-sm leading-relaxed text-slate-600 whitespace-pre-line break-words", review.commentaire || ""));
            list.appendChild(card);
        });
    }

    async function loadReviews() {
        try {
            const response = await fetch("/api/avis", {
                method: "GET",
                headers: { "Accept": "application/json" },
                cache: "no-store"
            });
            const result = await response.json().catch(() => null);
            if (!response.ok || !result || result.success !== true || !Array.isArray(result.avis)) {
                throw new Error(result?.error || "Les avis ne peuvent pas être chargés actuellement.");
            }
            if (loadError) loadError.classList.add("hidden");
            renderReviews(result.avis);
        } catch (error) {
            console.error("Chargement des avis impossible :", error);
            if (list.children.length === 1 && list.textContent.includes("Chargement")) {
                list.replaceChildren(makeElement("div", "md:col-span-2 bg-white border rounded-2xl p-6 text-sm text-slate-500", "Les avis ne sont pas disponibles pour le moment."));
            }
            if (loadError) {
                loadError.textContent = error.message || "Impossible de récupérer les avis.";
                loadError.classList.remove("hidden");
            }
            if (count) count.textContent = "Chargement indisponible";
        }
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (submit.disabled) return;
        success.classList.add("hidden");
        errorBox.classList.add("hidden");
        submit.disabled = true;
        submit.textContent = "Publication en cours…";

        const formData = new FormData(form);
        const data = {
            nom: String(formData.get("nom") || "").trim(),
            note: Number(formData.get("note")),
            prestation: String(formData.get("prestation") || ""),
            commentaire: String(formData.get("commentaire") || "").trim(),
            consentement: formData.get("consentement") === "on",
            website: String(formData.get("website") || "")
        };

        try {
            const response = await fetch("/api/avis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify(data)
            });
            const result = await response.json().catch(() => null);
            if (!response.ok || !result || result.success !== true) {
                throw new Error(result?.error || `Erreur du serveur (HTTP ${response.status}).`);
            }

            success.textContent = result.message || "Merci ! Votre avis est publié.";
            success.classList.remove("hidden");
            form.reset();
            await loadReviews();
            document.getElementById("reviewsHeading")?.scrollIntoView({ behavior: "smooth", block: "start" });
        } catch (error) {
            console.error("Publication de l'avis impossible :", error);
            errorBox.textContent = error.message || "Impossible de publier votre avis. Réessayez.";
            errorBox.classList.remove("hidden");
        } finally {
            submit.disabled = false;
            submit.textContent = "Publier mon avis";
        }
    });


    loadReviews();
});
