# LRZR Production — Portfolio

Site portfolio statique pour Axel / LRZR Production.
HTML/CSS/JS vanilla, zéro framework front-end, zéro service payant, déployable sur
GitHub Pages. Le contenu (photos, vidéos) est géré depuis un panneau d'administration
en ligne (`/admin/`) qui publie directement dans ce dépôt GitHub — voir la section
**Configurer l'admin** ci-dessous.

---


## 🚀 Déploiement sur GitHub Pages — étape par étape

### Prérequis
- Un compte GitHub (gratuit)
- Git installé sur votre machine ([git-scm.com](https://git-scm.com))
- Un éditeur de texte (VS Code recommandé)

---

### Étape 1 — Créer un repository GitHub

1. Connectez-vous sur [github.com](https://github.com)
2. Cliquez sur **New repository** (bouton vert en haut à droite)
3. Nommez-le exactement : `lrzrprod.github.io`
   > ⚠️ Le nom du repo détermine l'URL finale : `https://lrzrprod.github.io`
   > Remplacez `lrzrprod` par votre nom d'utilisateur GitHub exact.
4. Laissez-le **Public** (requis pour GitHub Pages gratuit)
5. Ne cochez rien (ni README, ni .gitignore) — vous poussez du code existant
6. Cliquez **Create repository**

---

### Étape 2 — Initialiser et pousser le code

Ouvrez un terminal dans le dossier du projet, puis :

```bash
# Initialiser git
git init

# Ajouter tous les fichiers (y compris .nojekyll)
git add -A

# Premier commit
git commit -m "feat: initial portfolio"

# Relier à votre repo GitHub (remplacer VOTRE_USERNAME)
git remote add origin https://github.com/VOTRE_USERNAME/VOTRE_USERNAME.github.io.git

# Pousser sur la branche principale
git push -u origin main
```

> Si votre branche par défaut s'appelle `master` et non `main`, remplacez dans la dernière commande.

---

### Étape 3 — Activer GitHub Pages

1. Allez sur votre repository GitHub
2. Cliquez sur l'onglet **Settings**
3. Dans le menu gauche, cliquez **Pages**
4. Sous **Source**, sélectionnez **Deploy from a branch**
5. Choisissez la branche `main` (ou `master`) et le dossier `/ (root)`
6. Cliquez **Save**

⏳ Le déploiement prend 1 à 3 minutes. Votre site sera ensuite disponible sur :
`https://VOTRE_USERNAME.github.io`

---

### Étape 4 — Vérifier que ça fonctionne

- Visitez `https://VOTRE_USERNAME.github.io`
- Vérifiez que le fichier `.nojekyll` est bien présent (il désactive le traitement Jekyll de GitHub qui pourrait ignorer certains fichiers commençant par `_`)

---

## 🔐 Configurer l'admin

Le site est statique (pas de serveur, pas de base de données payante). Le panneau admin
(`/admin/`) fonctionne en publiant directement dans **ce dépôt GitHub** : il lit et modifie
le fichier `assets/data/content.json` (qui contient toutes les photos, catégories et vidéos)
via l'API GitHub, avec un jeton d'accès personnel que tu génères une seule fois.

- **Photos** : pas d'upload — tu colles un lien direct vers l'image (ex : hébergée sur
  [ibb.co](https://ibb.co), comme aujourd'hui).
- **Vidéos** : pas d'upload — tu colles un lien YouTube.
- Aucun service tiers, aucun compte à créer à part GitHub (que tu as déjà).

### 1. Créer un jeton d'accès GitHub (une seule fois)
1. Va sur [github.com/settings/personal-access-tokens/new](https://github.com/settings/personal-access-tokens/new)
   (jeton **"fine-grained"**, plus sûr qu'un jeton classique)
2. **Resource owner** : ton compte
3. **Repository access** → **Only select repositories** → choisis le repo de ce site
   (ex : `lrzrprod.github.io`)
4. **Permissions** → **Repository permissions** → **Contents** → **Read and write**
5. Choisis une date d'expiration (ex : 1 an, tu pourras en régénérer un ensuite)
6. **Generate token** → copie-le immédiatement (il ne sera plus jamais affiché)

### 2. Vérifier la config du dépôt
Ouvre `assets/js/github-config.js` et vérifie que `GITHUB_OWNER` et `GITHUB_REPO`
correspondent bien à ton dépôt réel (ex : `lrzrprod` / `lrzrprod.github.io`). Change aussi
`ADMIN_PASSWORD` si tu veux un autre mot de passe que celui par défaut.

### 3. Se connecter
1. Va sur `https://TON-DOMAINE/admin/`
2. Renseigne le mot de passe (`assets/js/github-config.js` → `ADMIN_PASSWORD`) et colle le
   jeton créé à l'étape 1
3. Le jeton est enregistré uniquement dans ton navigateur (`localStorage`) — il n'est jamais
   commité dans le dépôt ni envoyé ailleurs qu'à `api.github.com`
4. Ajoute/supprime des photos (par lien), catégories et vidéos (par lien YouTube) : chaque
   action crée directement un commit sur GitHub, et le site se met à jour en 1-2 minutes,
   comme après un `git push` normal

> ⚠️ Le mot de passe n'est pas une vraie protection cryptographique (le code est visible
> côté client, comme sur n'importe quel site statique) — il sert juste à décourager un
> visiteur curieux. La vraie protection est le jeton GitHub : sans un jeton valide avec accès
> en écriture à ton dépôt, personne ne peut publier quoi que ce soit.

---

## ✏️ Personnaliser le contenu

### Où modifier quoi ?

| Ce que vous voulez changer | Où |
|---|---|
| Textes, titres, bio | `index.html` — commentaires `<!-- MODIFIER -->` |
| Couleurs, polices, espacements | `assets/css/style.css` — section `:root` (variables CSS) |
| Photos, catégories, vidéos du portfolio | Panneau admin sur `/admin/` (voir ci-dessus) |
| Image de fond du hero | Panneau admin, onglet **Hero** |
| Email de contact | `index.html` + clé Web3Forms |
| Réseaux sociaux | `index.html`, `galerie.html`, `videos.html` — footer + section contact |
| Domaine personnalisé | Voir ci-dessous |

---

## 🔑 Configurer Web3Forms (formulaire de contact)

1. Allez sur [web3forms.com](https://web3forms.com)
2. Entrez votre adresse email et cliquez **Create Access Key**
3. Copiez la clé générée
4. Dans `index.html`, remplacez `YOUR_WEB3FORMS_ACCESS_KEY` par votre clé :
   ```html
   <input type="hidden" name="access_key" value="VOTRE_CLÉ_ICI" />
   ```
5. Testez en envoyant un message depuis votre site — vous devriez recevoir un email.

> Le plan gratuit Web3Forms inclut 250 soumissions/mois, sans publicité.

---

## 🌐 Domaine personnalisé (optionnel)

Pour utiliser `www.lrzrprod.fr` au lieu de `lrzrprod.github.io` :

1. Achetez votre domaine chez OVH, Namecheap, Gandi, etc.
2. Dans les DNS de votre domaine, ajoutez un enregistrement **CNAME** :
   - Nom : `www`
   - Valeur : `VOTRE_USERNAME.github.io`
3. Pour l'apex (`lrzrprod.fr` sans www), ajoutez 4 enregistrements **A** pointant vers les IPs GitHub :
   ```
   185.199.108.153
   185.199.109.153
   185.199.110.153
   185.199.111.153
   ```
4. Dans GitHub Pages Settings, renseignez votre domaine dans **Custom domain**
5. Cochez **Enforce HTTPS** (disponible après quelques minutes)
6. Mettez à jour les URLs dans `index.html` (canonical, og:url, Schema.org) et `sitemap.xml`

---

## 📁 Structure du projet

```
/
├── index.html              ← Page d'accueil
├── galerie.html             ← Page portfolio photo
├── videos.html               ← Page portfolio vidéo
├── admin/
│   └── index.html            ← Panneau admin (mot de passe + jeton GitHub, noindex)
├── assets/
│   ├── css/
│   │   └── style.css         ← Styles complets
│   ├── data/
│   │   └── content.json      ← Photos, catégories, vidéos (source de vérité du site)
│   └── js/
│       ├── main.js           ← Logique du site public (carousel, galerie, lightbox, formulaire)
│       ├── admin.js          ← Logique du panneau admin (connexion, CRUD)
│       ├── github-api.js     ← Client pour lire/écrire content.json via l'API GitHub
│       ├── github-config.js  ← Dépôt cible + mot de passe admin
│       └── youtube-utils.js  ← Extraction d'ID YouTube depuis un lien
├── sitemap.xml               ← SEO sitemap
├── robots.txt                ← Directives crawlers (admin/ exclu)
├── .nojekyll                 ← Désactive Jekyll sur GitHub Pages
├── CNAME                     ← Domaine personnalisé
└── README.md                 ← Ce fichier
```

---

## 🔄 Mettre à jour le site

Après chaque modification de code (les photos/vidéos, elles, se gèrent depuis `/admin/`,
qui commite directement sur GitHub sans que tu aies besoin de lancer de commande Git) :

```bash
git add -A
git commit -m "update: description de vos changements"
git push
```

Le site se met à jour automatiquement en 1-2 minutes.

---

## 📄 Licence

© Axel / LRZR Production. Tous droits réservés.
