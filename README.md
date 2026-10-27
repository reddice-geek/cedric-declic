# Déclic Informatique — version corrigée pour Vercel

## Contact
Le formulaire envoie une requête `POST /api/contact`. La fonction Vercel `api/contact.js`
enregistre les demandes dans `data/demande.json` via l'API GitHub.

**Important :** Vercel ne permet pas de conserver durablement des écritures dans les fichiers
du site déployé. La fonction utilise donc l'API GitHub pour mettre à jour le fichier dans le dépôt.

## Configuration obligatoire dans Vercel
Dans le projet Vercel : **Settings → Environment Variables**, ajouter :
- `GITHUB_TOKEN` : un jeton GitHub finement limité au dépôt, avec permission **Contents: Read and write**.
- `GITHUB_OWNER` : le nom du compte ou de l'organisation GitHub propriétaire du dépôt.
- `GITHUB_REPO` : le nom du dépôt.
- `GITHUB_BRANCH` : branche qui reçoit les demandes (facultatif, défaut `main`).

Redéployer le site après l'ajout des variables. Le jeton doit rester uniquement dans Vercel,
jamais dans le JavaScript du navigateur ni dans un fichier commité.

**Confidentialité :** si le dépôt GitHub est public, les noms, emails, téléphones et messages
enregistrés dans `data/demande.json` seront publics. Utiliser impérativement un dépôt privé
ou un stockage privé avant de recevoir de vraies demandes. Le fichier est ajouté au dépôt par
un commit GitHub à chaque demande.

Le formulaire vérifie les champs obligatoires nom, email et message. Les erreurs serveur sont
affichées au visiteur au lieu de lui annoncer un succès fictif.
