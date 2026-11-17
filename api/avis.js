import { randomUUID } from "node:crypto";

const FILE_PATH = "Data/avis.json";
const GITHUB_API = "https://api.github.com";

function getConfig() {
    const token = process.env.GITHUB_TOKEN;
    const configuredRepo = (process.env.GITHUB_REPO || "").trim();
    const configuredOwner = (process.env.GITHUB_OWNER || "").trim();

    let owner = configuredOwner;
    let repo = configuredRepo;

    // Support both GITHUB_REPO="owner/repo" and the documented
    // GITHUB_OWNER="owner" + GITHUB_REPO="repo" configuration.
    if (configuredRepo.includes("/")) {
        const parts = configuredRepo.split("/").filter(Boolean);
        if (parts.length === 2) {
            owner = owner || parts[0];
            repo = parts[1];
        }
    }

    if (!token || !owner || !repo) {
        throw new Error("Configuration GitHub manquante.");
    }

    return {
        token,
        fileUrl: `${GITHUB_API}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${FILE_PATH}`
    };
}

function githubHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "Declic-Informatique"
    };
}

async function readReviews(fileUrl, headers) {
    const response = await fetch(fileUrl, { method: "GET", headers });

    if (response.status === 404) {
        return { reviews: [], sha: null };
    }

    if (!response.ok) {
        const details = await response.text();
        console.error("Erreur de lecture des avis sur GitHub :", response.status, details);
        throw new Error("Impossible de récupérer les avis clients.");
    }

    const file = await response.json();
    if (typeof file.content !== "string") {
        throw new Error("Le fichier des avis est illisible.");
    }

    const decoded = Buffer.from(file.content, "base64").toString("utf8");
    const reviews = JSON.parse(decoded);

    if (!Array.isArray(reviews)) {
        throw new Error("Le fichier des avis doit contenir un tableau JSON.");
    }

    return { reviews, sha: file.sha };
}

function cleanText(value) {
    return value
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
        .trim();
}

function parseBody(body) {
    if (typeof body === "string") {
        try {
            return JSON.parse(body);
        } catch {
            return {};
        }
    }
    return body && typeof body === "object" ? body : {};
}

export default async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");

    if (req.method !== "GET" && req.method !== "POST") {
        res.setHeader("Allow", "GET, POST");
        return res.status(405).json({ success: false, error: "Méthode non autorisée." });
    }

    try {
        const { token, fileUrl } = getConfig();
        const headers = githubHeaders(token);

        if (req.method === "GET") {
            const { reviews } = await readReviews(fileUrl, headers);
            return res.status(200).json({ success: true, avis: reviews });
        }

        const body = parseBody(req.body);

        // Honeypot anti-robot : les visiteurs humains ne voient pas ce champ.
        if (typeof body.website === "string" && body.website.trim()) {
            return res.status(200).json({ success: true, message: "Merci pour votre avis." });
        }

        const nom = typeof body.nom === "string" ? cleanText(body.nom) : "";
        const commentaire = typeof body.commentaire === "string" ? cleanText(body.commentaire) : "";
        const note = Number(body.note);
        const prestationsAutorisees = [
            "Dépannage informatique",
            "Montage PC",
            "Maintenance",
            "Conseil / achat",
            "Autre"
        ];
        const prestation = typeof body.prestation === "string" && prestationsAutorisees.includes(body.prestation)
            ? body.prestation
            : "";

        if (!nom || nom.length > 50 || !Number.isInteger(note) || note < 1 || note > 5 ||
            commentaire.length < 10 || commentaire.length > 1200 || typeof body.consentement !== "boolean" || body.consentement !== true) {
            return res.status(400).json({
                success: false,
                error: "Vérifiez votre nom, votre note et votre commentaire (10 à 1 200 caractères), puis confirmez la publication de votre avis."
            });
        }

        const nouvelAvis = {
            id: randomUUID(),
            date: new Date().toISOString(),
            nom,
            note,
            prestation,
            commentaire
        };

        // Relecture à chaque tentative : en cas de deux envois simultanés,
        // un conflit SHA GitHub est retenté sans écraser l'autre avis.
        for (let attempt = 0; attempt < 3; attempt += 1) {
            const { reviews, sha } = await readReviews(fileUrl, headers);
            reviews.push(nouvelAvis);

            const payload = {
                message: "Ajout d'un avis client - Déclic Informatique",
                content: Buffer.from(JSON.stringify(reviews, null, 2), "utf8").toString("base64")
            };
            if (sha) payload.sha = sha;

            const writeResponse = await fetch(fileUrl, {
                method: "PUT",
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (writeResponse.ok) {
                return res.status(201).json({
                    success: true,
                    message: "Merci ! Votre avis est maintenant publié.",
                    avis: nouvelAvis
                });
            }

            if (writeResponse.status !== 409 && writeResponse.status !== 422) {
                const details = await writeResponse.text();
                console.error("Erreur d'enregistrement d'un avis sur GitHub :", writeResponse.status, details);
                throw new Error("GitHub n'a pas confirmé la publication de l'avis.");
            }
        }

        return res.status(409).json({
            success: false,
            error: "Plusieurs avis ont été envoyés en même temps. Merci de réessayer."
        });

    } catch (error) {
        console.error("Erreur API avis :", error.message);
        return res.status(500).json({
            success: false,
            error: "Impossible de publier votre avis pour le moment. Réessayez un peu plus tard."
        });
    }
}
