export default async function handler(req, res) {
    // 1. Accepter uniquement les requêtes POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    // 2. Extraire les données envoyées par le formulaire
    const { nom, tel, email, sujet, message } = req.body;

    // Validation rapide des champs requis
    if (!nom || !email || !message) {
        return res.status(400).json({ error: 'Tous les champs requis ne sont pas remplis.' });
    }

    // 3. Préparer l'objet de la nouvelle demande
    const newDemande = {
        id: Date.now(),
        date: new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' }),
        nom,
        tel: tel || 'Non renseigné',
        email,
        sujet: sujet || 'Diagnostic 20€',
        message
    };

    // 4. Récupérer les variables d'environnement Vercel
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // Format attendu: "ton-pseudo/nom-du-repo"
    const filePath = "Data/demandes.json";

    if (!token || !repo) {
        console.error("Variables d'environnement GITHUB_TOKEN ou GITHUB_REPO manquantes sur Vercel.");
        return res.status(500).json({ error: 'Erreur de configuration serveur.' });
    }

    try {
        const githubApiUrl = `https://api.github.com/repos/${repo}/contents/${filePath}`;
        const headers = {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Declic-Informatique-App'
        };

        // 5. Récupérer le contenu actuel du fichier JSON sur GitHub
        const getRes = await fetch(githubApiUrl, { headers });

        let fileData = [];
        let sha = '';

        if (getRes.ok) {
            const fileJson = await getRes.json();
            sha = fileJson.sha; // Le SHA est obligatoire pour mettre à jour un fichier existant sur GitHub
            
            // Décoder le contenu Base64 envoyé par l'API GitHub
            const contentDecoded = Buffer.from(fileJson.content, 'base64').toString('utf8');
            try {
                fileData = JSON.parse(contentDecoded);
                if (!Array.isArray(fileData)) {
                    fileData = [];
                }
            } catch (e) {
                fileData = [];
            }
        } else if (getRes.status !== 404) {
            // Si l'erreur n'est pas "fichier non trouvé", lever une exception
            const errorText = await getRes.text();
            throw new Error(`Impossible de lire le fichier JSON sur GitHub: ${errorText}`);
        }

        // 6. Ajouter la nouvelle demande dans le tableau
        fileData.push(newDemande);

        // 7. Re-encoder l'ensemble du tableau JSON en Base64
        const updatedContent = Buffer.from(JSON.stringify(fileData, null, 2)).toString('base64');

        // 8. Envoyer la mise à jour à l'API GitHub
        const putBody = {
            message: `Nouvelle demande de devis de ${nom}`,
            content: updatedContent
        };
        
        // Inclure le SHA s'il s'agit d'une mise à jour d'un fichier existant
        if (sha) {
            putBody.sha = sha;
        }

        const putRes = await fetch(githubApiUrl, {
            method: 'PUT',
            headers: {
                ...headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(putBody)
        });

        if (!putRes.ok) {
            const errText = await putRes.text();
            throw new Error(`Erreur lors de l'écriture sur GitHub: ${errText}`);
        }

        // 9. Confirmer la réussite à la page de contact
        return res.status(200).json({ success: true, message: 'Demande enregistrée avec succès !' });

    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ error: 'Une erreur est survenue lors de l’enregistrement de votre demande.' });
    }
}
