export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Méthode non autorisée' });
    }

    const { nom, tel, email, sujet, message } = req.body;

    if (!nom || !email || !message) {
        return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    const newDemande = {
        id: Date.now(),
        date: new Date().toISOString(),
        nom,
        tel: tel || '',
        email,
        sujet: sujet || 'Diagnostic 20€',
        message
    };

    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO; // ex: "ton-pseudo/nom-du-repo"
    const filePath = "Data/demandes.json";

    if (!token || !repo) {
        return res.status(500).json({ error: 'Configuration serveur manquante (Variables GITHUB_TOKEN ou GITHUB_REPO)' });
    }

    try {
        // 1. Récupérer le fichier actuel depuis GitHub
        const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vercel-Contact-App'
            }
        });

        let fileData = [];
        let sha = '';

        if (getRes.ok) {
            const fileJson = await getRes.json();
            sha = fileJson.sha;
            const contentDecoded = Buffer.from(fileJson.content, 'base64').toString('utf8');
            fileData = JSON.parse(contentDecoded);
        }

        // Ajouter la nouvelle demande au tableau
        fileData.push(newDemande);

        // 2. Encoder le nouveau contenu en base64
        const updatedContent = Buffer.from(JSON.stringify(fileData, null, 2)).toString('base64');

        // 3. Mettre à jour le fichier sur GitHub
        const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Vercel-Contact-App'
            },
            body: JSON.stringify({
                message: `Nouvelle demande de contact de ${nom}`,
                content: updatedContent,
                sha: sha
            })
        });

        if (!putRes.ok) {
            const errText = await putRes.text();
            throw new Error(`Erreur GitHub API: ${errText}`);
        }

        return res.status(200).json({ success: true, message: 'Demande enregistrée avec succès !' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Erreur lors de l’enregistrement de la demande.' });
    }
}
