# 🔒 SECURITY - ReContent.dev

## 📋 Résumé des mesures de sécurité

Ce document détaille toutes les mesures de sécurité implémentées dans ReContent.dev pour un déploiement production sécurisé.

**Date de dernière mise à jour :** 2025-10-23
**Version :** 1.0.0

---

## ✅ Corrections appliquées - Audit de sécurité

### 🚨 Problèmes critiques résolus

#### 1. CORS sécurisé avec whitelist
**Avant :**
```javascript
app.use(cors()); // ❌ Toutes origines autorisées
```

**Après :**
```javascript
// ✅ Whitelist stricte basée sur l'environnement
const allowedOrigins = isProduction
  ? ['https://recontent.devamalix.fr', 'https://www.recontent.devamalix.fr']
  : ['http://localhost:8090', 'http://localhost:5173'];
```

**Fichier :** [api/config/cors.js](api/config/cors.js)

---

#### 2. Rate limiting implémenté
**Protection contre :**
- Abus de l'API
- DDoS simples
- Épuisement du quota Mistral AI

**Limites configurées :**
- **Général :** 200 requêtes / 15 minutes par IP
- **Génération de contenu :** 100 requêtes / 15 minutes par IP
- **Authentification (futur) :** 5 tentatives / heure

**Fichier :** [api/config/rateLimiter.js](api/config/rateLimiter.js)

---

#### 3. Validation stricte des inputs
**Validations implémentées :**
- ✅ Longueur du contenu : 100 - 10,000 caractères
- ✅ Whitelist des plateformes : `['twitter', 'linkedin', 'devto', 'github', 'newsletter']`
- ✅ Whitelist des tons : `['casual', 'professional', 'technical']`
- ✅ Limites sur les champs de profil (nom max 100 chars, bio max 500 chars)
- ✅ Validation du type et format des données

**Fichier :** [api/middleware/validator.js](api/middleware/validator.js)

---

#### 4. Logging professionnel avec Winston
**Remplace :** 11 `console.log()` par un logger structuré

**Niveaux de log :**
- **Production :** Warn et Error uniquement
- **Développement :** Debug, Info, Warn, Error

**Rotation des logs :**
- Fichiers logs : `logs/error.log` et `logs/combined.log`
- Taille maximale : 5MB par fichier
- Conservation : 5 fichiers maximum

**Fichier :** [api/config/logger.js](api/config/logger.js)

---

#### 5. Dockerfiles sécurisés multi-stage
**API - Avant :**
```yaml
image: node:20-alpine
command: sh -c "npm install && npm start"  # ❌ Root, réinstallation à chaque démarrage
```

**API - Après :**
```dockerfile
# ✅ Multi-stage, npm ci, USER node, dumb-init
FROM node:20-alpine AS dependencies
RUN npm ci --only=production

FROM node:20-alpine AS production
USER nodejs  # Non-root
CMD ["node", "index.js"]
```

**Fichiers :**
- [api/Dockerfile](api/Dockerfile)
- [frontend/Dockerfile](frontend/Dockerfile)

---

#### 6. .dockerignore créés
**Protection contre :**
- Inclusion de `node_modules` dans les images
- Exposition de fichiers `.env` dans les images
- Copie de fichiers `.git` et logs

**Fichiers :**
- [.dockerignore](.dockerignore)
- [api/.dockerignore](api/.dockerignore)
- [frontend/.dockerignore](frontend/.dockerignore)

---

#### 7. Port API non exposé publiquement
**Avant :**
```yaml
ports:
  - "3002:3002"  # ❌ API accessible directement
```

**Après :**
```yaml
# ✅ Port commenté, uniquement accessible via Traefik
# ports:
#   - "3002:3002"
```

**Fichier :** [docker-compose.yml](docker-compose.yml)

---

## 🛡️ Architecture de sécurité

```
Internet
   │
   └─> Traefik (HTTPS uniquement)
        │
        ├─> Frontend (recontent.devamalix.fr)
        │   └─> Nginx (headers de sécurité)
        │
        └─> API (recontent.devamalix.fr/api)
            ├─> CORS whitelist
            ├─> Rate limiting
            ├─> Input validation
            └─> Winston logging
```

---

## 🔐 Variables d'environnement sensibles

### ⚠️ CRITIQUE - Ne JAMAIS commiter

**Fichier `.env` (à créer sur le serveur) :**
```bash
MISTRAL_API_KEY=your_actual_mistral_api_key_here
API_PORT=3002
NODE_ENV=production
TZ=Europe/Paris
```

### ✅ Protection en place

- `.env` dans [.gitignore](.gitignore#L23)
- `.env.example` avec placeholders uniquement
- Variables chargées via `dotenv` dans [api/index.js](api/index.js#L11)
- Validation au démarrage : [api/index.js](api/index.js#L56)

---

## 🔒 Traefik - Configuration HTTPS

### Labels Traefik appliqués

**Frontend :**
```yaml
- "traefik.http.routers.recontent-frontend.rule=Host(`recontent.devamalix.fr`)"
- "traefik.http.routers.recontent-frontend.entrypoints=websecure"
- "traefik.http.routers.recontent-frontend.tls.certresolver=letsencrypt"
```

**API :**
```yaml
- "traefik.http.routers.recontent-api.rule=Host(`recontent.devamalix.fr`) && PathPrefix(`/api`)"
- "traefik.http.middlewares.recontent-api-stripprefix.stripprefix.prefixes=/api"
```

### Security Headers

Headers de sécurité automatiques via Traefik :
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

**Fichier :** [docker-compose.yml](docker-compose.yml#L105-L111)

---

## 🧪 Tests de sécurité

### 1. Vérifier CORS

```bash
# Test depuis origine non autorisée (doit échouer)
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://recontent.devamalix.fr/api/generate

# Test depuis origine autorisée (doit réussir)
curl -H "Origin: https://recontent.devamalix.fr" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://recontent.devamalix.fr/api/generate
```

### 2. Vérifier Rate Limiting

```bash
# Envoyer 101 requêtes rapidement (la 101ème doit échouer avec 429)
for i in {1..101}; do
  curl https://recontent.devamalix.fr/api/health
done
```

### 3. Vérifier Validation

```bash
# Test avec contenu trop court (doit échouer)
curl -X POST https://recontent.devamalix.fr/api/generate \
     -H "Content-Type: application/json" \
     -d '{"content":"test","platforms":["twitter"]}'

# Test avec plateforme invalide (doit échouer)
curl -X POST https://recontent.devamalix.fr/api/generate \
     -H "Content-Type: application/json" \
     -d '{"content":"...contenu valide...","platforms":["facebook"]}'
```

### 4. Vérifier que l'API n'est pas directement accessible

```bash
# Doit échouer (connexion refusée)
curl http://recontent.devamalix.fr:3002/health
```

---

## 📊 Monitoring et logs

### Logs de l'API

**Emplacement :** `api/logs/`
- `error.log` - Erreurs uniquement
- `combined.log` - Warn + Error

**Accès aux logs en production :**
```bash
# Logs temps réel
docker logs -f nexus-recontent-api

# Logs archivés
docker exec nexus-recontent-api cat /app/logs/combined.log
```

### Métriques à surveiller

- Taux d'erreur 4xx/5xx
- Nombre de requêtes bloquées par rate limiting
- Temps de réponse de Mistral API
- Violations CORS

---

## 🚀 Déploiement sécurisé - Checklist

### Avant le déploiement

- [ ] Créer le fichier `.env` sur le VPS avec la vraie clé Mistral
- [ ] Vérifier que le réseau `traefik-network` existe
- [ ] Configurer le DNS : `recontent.devamalix.fr` → IP du VPS
- [ ] Tester en local avec `docker-compose.dev.yml`

### Commandes de déploiement

```bash
# Sur le VPS
cd /path/to/recontent

# 1. Créer .env
cp .env.example .env
nano .env  # Ajouter la vraie clé Mistral

# 2. Build des images
docker-compose build

# 3. Démarrer les services
docker-compose up -d

# 4. Vérifier les logs
docker-compose logs -f

# 5. Tester les endpoints
curl https://recontent.devamalix.fr/api/health
curl https://recontent.devamalix.fr/
```

### Après le déploiement

- [ ] Vérifier le certificat HTTPS (Let's Encrypt)
- [ ] Tester CORS depuis le frontend
- [ ] Vérifier rate limiting
- [ ] Tester la génération de contenu
- [ ] Configurer Watchtower pour mises à jour automatiques
- [ ] Configurer monitoring (Uptime Robot, etc.)

---

## 🐛 Dépendances et vulnérabilités

### Mise à jour effectuée

- `dotenv` : 16.6.1 → **17.2.3** ✅

### Dépendances actuelles (sans vulnérabilités connues)

**API :**
```json
{
  "express": "^4.18.2",
  "axios": "^1.6.2",
  "cors": "^2.8.5",
  "dotenv": "^17.2.3",
  "winston": "^3.18.3",
  "express-rate-limit": "^8.1.0"
}
```

**Frontend :**
```json
{
  "react": "^19.1.1",
  "axios": "^1.12.2",
  "react-router-dom": "^7.9.3"
}
```

### Scan régulier recommandé

```bash
# Vérifier les vulnérabilités
cd api && npm audit
cd frontend && npm audit

# Mettre à jour les dépendances
npm update
```

---

## 📞 Reporting de vulnérabilités

Si vous découvrez une vulnérabilité de sécurité, **NE PAS** créer d'issue publique.

**Contact :** matthieu.alix@example.com

**Informations à fournir :**
- Description de la vulnérabilité
- Étapes pour reproduire
- Impact potentiel
- Suggestion de correction (si possible)

**Délai de réponse :** 48 heures

---

## 📚 Références

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://cheatsheetseries.owasp.org/cheatsheets/Nodejs_Security_Cheat_Sheet.html)

---

## 📄 Licence

Ce projet est sous licence MIT. Voir [LICENSE](LICENSE) pour plus de détails.

---

**Dernière révision :** 2025-10-23
**Auteur :** Matthieu Alix
**Projet :** ReContent.dev v1.0.0
