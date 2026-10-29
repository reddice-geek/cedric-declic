
export default async function handler(req, res) {
    // Accepter uniquement les requêtes POST.
    if (req.method !== "POST") {
        res.setHeader("Allow", "POST");
        return res.status(405).json({
            success: false,
            error: "Méthode non autorisée."
        });
    }

    try {
        // Vérifier les données reçues.
        const { nom, tel, email, sujet, message } = req.body || {};

        if (
            typeof nom !== "string" ||
            typeof email !== "string" ||
            typeof message !== "string" ||
            !nom.trim() ||
            !email.trim() ||
            !message.trim()
        ) {
            return res.status(400).json({
                success: false,
                error: "Merci de remplir les champs obligatoires."
            });
        }

        // Vérifier la configuration Vercel.
        const token = process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPO;

        if (!token || !repo) {
            console.error("Configuration GitHub manquante.");

            return res.status(500).json({
                success: false,
                error: "Le serveur est mal configuré. Contacte-moi directement."
            });
        }

        // IMPORTANT : conserver le chemin réel du fichier sur GitHub.
        const filePath = "Data/demandes.json";

        const githubApiUrl =
            `https://api.github.com/repos/${repo}/contents/${filePath}`;

        const headers = {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "Declic-Informatique"
        };

        // Lire le fichier existant sur GitHub.
        const getResponse = await fetch(githubApiUrl, {
            method: "GET",
            headers
        });

        let demandes = [];
        let sha;

        if (getResponse.ok) {
            const fileInfo = await getResponse.json();
            sha = fileInfo.sha;

            if (!fileInfo.content) {
                throw new Error("Le fichier JSON est vide ou illisible.");
            }

            const contenu = Buffer
                .from(fileInfo.content, "base64")
                .toString("utf8");

            demandes = JSON.parse(contenu);

            if (!Array.isArray(demandes)) {
                throw new Error(
                    "Le contenu du fichier JSON doit être un tableau."
                );
            }
        } else if (getResponse.status === 404) {
            // Le fichier n'existe pas encore : créer un tableau vide.
            demandes = [];
        } else {
            const details = await getResponse.text();

            console.error(
                "Erreur de lecture GitHub :",
                getResponse.status,
                details
            );

            throw new Error("Impossible de lire les demandes sur GitHub.");
        }

        // Préparer la nouvelle demande.
        const nouvelleDemande = {
            id: Date.now(),
            date: new Date().toLocaleString("fr-FR", {
                timeZone: "Europe/Paris"
            }),
            nom: nom.trim(),
            tel: typeof tel === "string" && tel.trim()
                ? tel.trim()
                : "Non renseigné",
            email: email.trim(),
            sujet: typeof sujet === "string" && sujet.trim()
                ? sujet.trim()
                : "Diagnostic 20€",
            message: message.trim()
        };

        // Ajouter la demande sans supprimer les précédentes.
        demandes.push(nouvelleDemande);

        const contenuEncode = Buffer
            .from(JSON.stringify(demandes, null, 2), "utf8")
            .toString("base64");

        const corpsGitHub = {
            message: "Nouvelle demande de contact",
            content: contenuEncode
        };

        // GitHub exige le SHA pour modifier un fichier existant.
        if (sha) {
            corpsGitHub.sha = sha;
        }

        // Enregistrer le fichier sur GitHub.
        const putResponse = await fetch(githubApiUrl, {
            method: "PUT",
            headers: {
                ...headers,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(corpsGitHub)
        });

        if (!putResponse.ok) {
            const details = await putResponse.text();

            console.error(
                "Erreur d'écriture GitHub :",
                putResponse.status,
                details
            );

            throw new Error("GitHub n'a pas confirmé l'enregistrement.");
        }

        // Confirmer uniquement après la réponse positive de GitHub.
        return res.status(200).json({
            success: true,
            message: "Votre demande a bien été enregistrée."
        });

    } catch (error) {
        console.error("Erreur API contact :", error.message);

        return res.status(500).json({
            success: false,
            error: "Impossible de confirmer l'enregistrement de votre demande. Réessaie ou contacte-moi directement."
        });
    }
}
