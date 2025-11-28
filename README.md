# 🚀 ReContent.dev

> Outil intelligent de reformulation de contenu alimenté par IA Mistral

[![Status](https://img.shields.io/badge/status-in%20development-yellow)]()
[![Version](https://img.shields.io/badge/version-1.0.0-blue)]()
[![License](https://img.shields.io/badge/license-MIT-green)]()
[![Docker](https://img.shields.io/badge/docker-compose-blue)]()

---

## 📋 À propos

ReContent.dev transforme votre contenu technique en posts optimisés pour Twitter, LinkedIn et Dev.to grâce à l'IA Mistral. Application fullstack dockerisée avec interface React moderne et API Node.js performante.

**Idéal pour :** Développeurs, créateurs de contenu technique, DevRel qui veulent repurposer leur contenu efficacement.

---

## ✨ Fonctionnalités

- 🤖 **Génération IA** - Utilise Mistral AI pour adapter intelligemment votre contenu
- 🐦 **Twitter Threads** - Threads numérotés optimisés (8-12 tweets)
- 💼 **Posts LinkedIn** - Format professionnel avec hashtags pertinents
- 📝 **Articles Dev.to** - Markdown structuré prêt à publier
- 👤 **Profil personnalisé** - Adaptez le ton (Casual/Professional/Technical)
- 📋 **Copie rapide** - Bouton de copie dans le clipboard pour chaque format
- 📚 **Historique** - Sauvegarde de vos 20 dernières générations
- 🎨 **Interface sombre** - Design moderne et responsive

---

## 🛠️ Stack Technique

### Frontend
- **React 18** - Interface utilisateur réactive
- **Vite** - Build tool moderne et rapide
- **Tailwind CSS** - Framework CSS utility-first (dark mode)
- **React Router v6** - Routing côté client
- **Lucide React** - Bibliothèque d'icônes moderne

### Backend
- **Node.js 20** - Runtime JavaScript
- **Express** - Framework web minimaliste
- **Mistral AI API** - Modèle de langage pour la reformulation
- **Axios** - Client HTTP pour les appels API

### Infrastructure
- **Docker & Docker Compose** - Conteneurisation multi-services
- **Nginx** - Reverse proxy et serveur de fichiers statiques
- **Alpine Linux** - Images Docker légères et sécurisées

---

## 📦 Installation

### Prérequis

- **Docker** (v24+) et **Docker Compose** (v2+)
- **Clé API Mistral AI** - [Obtenir gratuitement ici](https://console.mistral.ai/)

### Démarrage rapide
```bash
# 1. Cloner le repository
git clone https://github.com/votre-username/recontent.git
cd recontent

# 2. Configurer les variables d'environnement
cp .env.example .env
nano .env  # Ajouter votre clé Mistral API

# 3. Lancer l'application avec Docker
docker compose up -d

# 4. Vérifier que tout fonctionne
docker compose ps
```

### Accès à l'application

- **Frontend :** http://localhost:8090/recontent/
- **API :** http://localhost:3002
- **Health check :** http://localhost:3002/health

### Développement local (sans Docker)
```bash
# Terminal 1 - Frontend
cd frontend
npm install
npm run dev
# → http://localhost:5173

# Terminal 2 - API
cd api
npm install
npm start
# → http://localhost:3002
```

---

## 💻 Workflow d'utilisation

1. **Profil** (optionnel) - Configurez votre nom, bio et ton de communication
2. **Home** - Collez votre contenu (minimum 100 caractères)
3. **Sélection** - Choisissez les plateformes cibles (Twitter/LinkedIn/Dev.to)
4. **Génération** - Cliquez sur "Generate" et laissez l'IA travailler
5. **Édition** - Modifiez les résultats si besoin
6. **Copie** - Utilisez le bouton "Copy" pour chaque plateforme
7. **Historique** - Consultez vos 20 dernières générations

---

## 🏗️ Architecture

### Vue d'ensemble
```
┌──────────────┐
│  Navigateur  │
└──────┬───────┘
       │ :8090
       ▼
┌────────────────────────┐
│   Nginx (Reverse Proxy) │
│   - Frontend statique   │
│   - Proxy API           │
└──────┬─────────────────┘
       │
       ├─ /recontent/ → Frontend (React)
       │
       └─ /api/recontent/ → API Node.js :3002
                             │
                             └─ Proxy → Mistral AI
```

### Services Docker

| Conteneur | Image | Port | Rôle |
|-----------|-------|------|------|
| recontent-frontend | node:20-alpine | - | Build Vite (one-shot) |
| recontent-api | node:20-alpine | 3002 | API Express |
| nginx-recontent | nginx:alpine | 8090→80 | Reverse proxy |

**Réseau :** `recontent-network` (isolé)

### Structure du projet
```
recontent/
├── docker-compose.yml       # Orchestration Docker
├── .env.example             # Template variables d'environnement
├── README.md                # Documentation
├── api/
│   ├── index.js             # Serveur Express + routes
│   └── package.json         # Dépendances Node.js
├── frontend/
│   ├── src/
│   │   ├── components/      # Composants réutilisables
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── CopyButton.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   └── ResultsTabs.jsx
│   │   ├── pages/           # Pages de l'application
│   │   │   ├── Home.jsx
│   │   │   ├── Profile.jsx
│   │   │   └── History.jsx
│   │   ├── services/        # Logique métier
│   │   │   ├── mistralAPI.js
│   │   │   └── storage.js
│   │   ├── contexts/
│   │   │   └── ToastContext.jsx
│   │   └── utils/
│   │       └── constants.js
│   ├── dist/                # Build de production (généré)
│   ├── package.json         # Dépendances React
│   ├── vite.config.js       # Configuration Vite
│   └── index.html           # Template HTML
└── nginx/
    ├── recontent.conf       # Configuration Nginx
    └── entrypoint.sh        # Script de démarrage custom
```

---

## 🔧 Commandes Docker

### Gestion de base
```bash
# Démarrer la stack complète
docker compose up -d

# Arrêter la stack
docker compose down

# Voir les logs en temps réel
docker compose logs -f

# Voir les logs d'un service spécifique
docker compose logs -f recontent-api
docker compose logs -f nginx-recontent

# Vérifier le statut des services
docker compose ps
```

### Maintenance
```bash
# Redémarrer un service
docker compose restart recontent-api
docker compose restart nginx-recontent

# Rebuild le frontend après modifications
docker compose up recontent-frontend

# Rebuild complet de la stack
docker compose down
docker compose up -d --build

# Nettoyer les conteneurs et volumes
docker compose down -v
```

---

## 🧪 Tests & Vérification

### Tests automatisés

```bash
# Tests API (38 tests) - Express endpoints, validation, error handling
docker compose --profile test run --rm recontent-test

# Tests Frontend (15 tests) - React components, services, user interactions
docker run --rm -v $(pwd)/frontend:/app -w /app node:20-alpine sh -c "npm test"
```

| Suite | Tests | Couverture |
|-------|-------|------------|
| API (backend) | 38 tests | health, generate, validation, errors |
| Frontend | 15 tests | storage, mistralAPI, Home, CopyButton |

### Health checks
```bash
# Vérifier que Nginx répond
curl http://localhost:8090/health
# Résultat attendu : OK - ReContent NEXUS

# Vérifier l'API
curl http://localhost:3002/health | jq
# Résultat attendu :
# {
#   "status": "OK",
#   "service": "ReContent API",
#   "timestamp": "2025-10-15T...",
#   "mistral_configured": true
# }

# Vérifier que le frontend charge
curl -I http://localhost:8090/recontent/
# Résultat attendu : HTTP/1.1 200 OK
```

### Tests manuels

1. Accéder à http://localhost:8090/recontent/
2. Aller sur la page "Profile" et configurer un profil
3. Revenir sur "Home" et coller du contenu (>100 caractères)
4. Sélectionner "Twitter" et cliquer "Generate"
5. Vérifier que le thread est généré
6. Tester le bouton "Copy"
7. Vérifier l'historique dans "History"

---

## 🛠️ API Reference

### GET `/health`

Health check de l'API.

**Réponse :**
```json
{
  "status": "OK",
  "service": "ReContent API",
  "timestamp": "2025-10-15T14:27:09.295Z",
  "mistral_configured": true
}
```

### POST `/generate`

Génère du contenu reformulé via Mistral AI.

**Body :**
```json
{
  "content": "Votre contenu original (min 100 caractères)",
  "platforms": ["twitter", "linkedin", "devto"],
  "profile": {
    "name": "John Doe",
    "bio": "Developer advocate",
    "tone": "professional"
  }
}
```

**Réponse :**
```json
{
  "success": true,
  "results": {
    "twitter": "Thread généré...",
    "linkedin": "Post LinkedIn...",
    "devto": "Article Dev.to..."
  },
  "usage": {
    "prompt_tokens": 150,
    "completion_tokens": 500
  }
}
```

---

## 📝 Roadmap

### ✅ Phase 1 : MVP (Terminée)
- [x] Interface utilisateur React + Vite
- [x] Intégration Mistral AI
- [x] Génération Twitter, LinkedIn, Dev.to, GitHub, Newsletter
- [x] Système de profil utilisateur
- [x] Historique des générations (LocalStorage)
- [x] Export des résultats (.txt, .md)
- [x] Dockerisation complète (frontend + API + Nginx)
- [x] Configuration reverse proxy avec gestion SPA

### ✅ Phase 2 : Tests & Qualité (Terminée)
- [x] Tests unitaires API (Vitest) - 38 tests
- [x] Tests unitaires Frontend (Vitest) - 15 tests
- [x] Coverage de code >70% (API: 67%, Frontend: 77%)
- [ ] CI/CD avec GitHub Actions
- [ ] Linting et formatting automatiques

### ✅ Phase 3 : Production (Terminée)
- [x] Déploiement sur VPS
- [x] Configuration HTTPS (Let's Encrypt)
- [x] Nom de domaine personnalisé
- [ ] Monitoring et alertes
- [ ] Logs centralisés

### 🎨 Phase 4 : Fonctionnalités avancées
- [ ] Templates de prompts personnalisables
- [ ] Support de plus de plateformes (Reddit, Medium, etc.)
- [ ] Statistiques d'utilisation
- [ ] Mode hors ligne avec cache

---

## 📄 Licence

MIT License - Voir [LICENSE](LICENSE) pour plus de détails.

---

## 👤 Auteur

**Matthieu Alix**
- GitHub : [@MatthALXdev](https://github.com/MatthALXdev)
- LinkedIn : [matth-alx-dev](https://www.linkedin.com/in/matth-alx-dev/)

---

⚠️ **Note de développement :** Ce projet est actuellement en développement actif dans le cadre d'une recherche d'alternance en développement fullstack (Bachelor). Contributions et suggestions bienvenues !

# CI/CD Pipeline configured
