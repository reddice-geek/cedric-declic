// Vercel Serverless Function — sauvegarde les demandes dans data/demande.json via l'API GitHub.
// Variables Vercel requises : GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO.
// Optionnelle : GITHUB_BRANCH (par défaut : main).
export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Méthode non autorisée.' });
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    return res.status(500).json({
      ok: false,
      message: 'Le serveur de contact n’est pas configuré. Réessaie plus tard ou contacte-moi par téléphone.'
    });
  }

  const clean = (value, max = 4000) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

  const nom = clean(req.body?.nom, 120);
  const tel = clean(req.body?.tel, 50);
  const email = clean(req.body?.email, 254).toLowerCase();
  const sujet = clean(req.body?.sujet, 120);
  const message = clean(req.body?.message, 4000);

  if (!nom || !email || !message) {
    return res.status(400).json({ ok: false, message: 'Merci de renseigner le nom, l’email et le message.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: 'Adresse email invalide.' });
  }

  const path = 'data/demande.json';
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}/contents/${path}`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json'
  };

  try {
    let sha;
    let demandes = [];
    const read = await fetch(`${apiUrl}?ref=${encodeURIComponent(branch)}`, { headers });
    if (read.status === 200) {
      const file = await read.json();
      sha = file.sha;
      const decoded = Buffer.from(file.content.replace(/\n/g, ''), 'base64').toString('utf8');
      try {
        const parsed = JSON.parse(decoded);
        demandes = Array.isArray(parsed) ? parsed : [];
      } catch {
        return res.status(500).json({ ok: false, message: 'Le fichier des demandes contient un JSON invalide.' });
      }
    } else if (read.status !== 404) {
      return res.status(502).json({ ok: false, message: 'Impossible de lire le fichier des demandes sur GitHub.' });
    }

    demandes.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date: new Date().toISOString(),
      nom, tel, email, sujet: sujet || 'Demande de contact', message
    });

    const content = Buffer.from(`${JSON.stringify(demandes, null, 2)}\n`, 'utf8').toString('base64');
    const payload = {
      message: `Nouvelle demande de contact (${new Date().toISOString()})`,
      content,
      branch
    };
    if (sha) payload.sha = sha;

    const write = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload)
    });
    if (!write.ok) {
      const details = await write.json().catch(() => ({}));
      console.error('GitHub write error:', write.status, details.message || '');
      return res.status(502).json({
        ok: false,
        message: 'La demande n’a pas pu être enregistrée. Réessaie ou contacte-moi par téléphone.'
      });
    }

    return res.status(200).json({ ok: true, message: 'Demande enregistrée.' });
  } catch (error) {
    console.error('Contact API error:', error);
    return res.status(500).json({ ok: false, message: 'Erreur serveur. Réessaie plus tard.' });
  }
}
