# 🚀 DEPLOYMENT - ReContent.dev

Guide complet de déploiement production sur VPS avec Traefik.

---

## 📋 Prérequis

### Sur le VPS

- [x] Docker (v24+) installé
- [x] Docker Compose (v2+) installé
- [x] Traefik déjà configuré et fonctionnel
- [x] Réseau Docker `traefik-network` créé
- [x] DNS configuré : `recontent.devamalix.fr` → IP du VPS

### Vérifications

```bash
# Docker version
docker --version
# Docker version 24.0.0 ou plus récent

# Docker Compose version
docker-compose --version
# Docker Compose version v2.0.0 ou plus récent

# Vérifier que Traefik tourne
docker ps | grep traefik

# Vérifier que le réseau traefik existe
docker network ls | grep traefik-network
```

Si le réseau n'existe pas :
```bash
docker network create traefik-network
```

---

## 🔐 Configuration des secrets

### 1. Créer le fichier .env

```bash
cd /path/to/recontent
cp .env.example .env
nano .env
```

### 2. Configurer les variables

```bash
# Remplacer par votre vraie clé Mistral AI
MISTRAL_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Laisser les autres valeurs par défaut
API_PORT=3002
NODE_ENV=production
TZ=Europe/Paris
```

**IMPORTANT :** Ne JAMAIS commiter ce fichier `.env` !

---

## 📦 Build et déploiement

### Méthode 1 : Déploiement complet (recommandé)

```bash
# 1. Cloner le repository (ou pull les dernières modifications)
git pull origin main

# 2. Build des images Docker
docker-compose build

# 3. Démarrer les services
docker-compose up -d

# 4. Vérifier que tout est démarré
docker-compose ps
```

### Méthode 2 : Rebuild complet (si changements majeurs)

```bash
# Arrêter et supprimer les anciens containers
docker-compose down

# Rebuild sans cache
docker-compose build --no-cache

# Redémarrer
docker-compose up -d
```

---

## ✅ Vérifications post-déploiement

### 1. Vérifier les containers

```bash
# Statut des services
docker-compose ps

# Devrait afficher :
# nexus-recontent-api          running (healthy)
# nexus-recontent-frontend     running (healthy)
```

### 2. Vérifier les logs

```bash
# Logs de l'API
docker logs -f nexus-recontent-api

# Devrait afficher :
# ✅ ReContent API v1.0.0 listening on port 3002
# 🌍 Environment: production
# 🔑 Mistral API: Configured ✅
# 🔒 CORS: Whitelist enabled
# 🛡️  Rate limiting: Active
# 📝 Validation: Strict mode

# Logs du frontend
docker logs -f nexus-recontent-frontend
```

### 3. Tester les endpoints

```bash
# Test API health check
curl https://recontent.devamalix.fr/api/health

# Devrait retourner :
# {
#   "status": "OK",
#   "service": "ReContent API",
#   "version": "1.0.0",
#   "environment": "production",
#   "mistral_configured": true
# }

# Test frontend
curl -I https://recontent.devamalix.fr/

# Devrait retourner :
# HTTP/2 200
```

### 4. Vérifier le certificat HTTPS

```bash
# Vérifier le certificat SSL
openssl s_client -connect recontent.devamalix.fr:443 -servername recontent.devamalix.fr

# Ou dans le navigateur : https://recontent.devamalix.fr/
# Le cadenas doit être vert avec certificat Let's Encrypt valide
```

---

## 🔒 Tests de sécurité

### 1. Vérifier que l'API n'est pas directement accessible

```bash
# Test sur le port 3002 (doit échouer)
curl http://recontent.devamalix.fr:3002/health
# Connection refused ✅

# L'API ne doit être accessible que via /api
curl https://recontent.devamalix.fr/api/health
# {"status":"OK",...} ✅
```

### 2. Tester CORS

```bash
# Depuis une origine non autorisée (doit échouer)
curl -H "Origin: https://evil.com" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://recontent.devamalix.fr/api/generate

# Depuis l'origine autorisée (doit réussir)
curl -H "Origin: https://recontent.devamalix.fr" \
     -H "Access-Control-Request-Method: POST" \
     -X OPTIONS \
     https://recontent.devamalix.fr/api/generate
```

### 3. Tester Rate Limiting

```bash
# Envoyer beaucoup de requêtes rapidement
for i in {1..101}; do
  curl -s https://recontent.devamalix.fr/api/health
done

# La 101ème devrait retourner un 429 (Too Many Requests)
```

---

## 📊 Monitoring et maintenance

### Visualiser les logs

```bash
# Logs en temps réel
docker-compose logs -f

# Logs spécifiques
docker-compose logs -f recontent-api
docker-compose logs -f recontent-frontend

# Dernières 100 lignes
docker-compose logs --tail=100
```

### Redémarrer un service

```bash
# Redémarrer l'API uniquement
docker-compose restart recontent-api

# Redémarrer le frontend uniquement
docker-compose restart recontent-frontend

# Redémarrer tout
docker-compose restart
```

### Mettre à jour l'application

```bash
# 1. Pull les nouvelles modifications
git pull origin main

# 2. Rebuild les images
docker-compose build

# 3. Recréer les containers
docker-compose up -d

# 4. Vérifier
docker-compose ps
docker-compose logs -f
```

### Voir les métriques

```bash
# Statistiques Docker
docker stats nexus-recontent-api nexus-recontent-frontend

# Espace disque utilisé
docker system df
```

---

## 🛠️ Troubleshooting

### Problème : L'API ne démarre pas

```bash
# Vérifier les logs
docker logs nexus-recontent-api

# Erreur courante : clé Mistral manquante
# Solution : Vérifier le fichier .env
docker exec nexus-recontent-api env | grep MISTRAL

# Rebuild si nécessaire
docker-compose down
docker-compose build --no-cache recontent-api
docker-compose up -d
```

### Problème : Certificat HTTPS invalide

```bash
# Vérifier les logs Traefik
docker logs traefik

# Forcer le renouvellement
docker exec traefik traefik healthcheck

# Vérifier la configuration DNS
nslookup recontent.devamalix.fr
```

### Problème : 502 Bad Gateway

**Causes possibles :**
1. L'API n'est pas démarrée → `docker-compose ps`
2. Healthcheck échoue → `docker logs nexus-recontent-api`
3. Réseau Traefik mal configuré → `docker network inspect traefik-network`

**Solution :**
```bash
# Redémarrer tout
docker-compose down
docker-compose up -d

# Attendre que les healthchecks passent (40s max)
watch docker-compose ps
```

### Problème : CORS errors dans le navigateur

**Vérifier la configuration CORS :**
```bash
# Vérifier NODE_ENV
docker exec nexus-recontent-api env | grep NODE_ENV

# Doit être "production" pour whitelist production
# Si c'est "development", modifier .env et redémarrer
```

---

## 🔄 Rollback en cas de problème

### Méthode rapide

```bash
# Revenir à la version précédente du code
git log --oneline  # Trouver le commit précédent
git checkout <commit-hash>

# Rebuild
docker-compose down
docker-compose build
docker-compose up -d
```

### Méthode avec tags Docker

```bash
# Si vous taguez vos images
docker tag recontent-api:latest recontent-api:v1.0.0
docker tag recontent-frontend:latest recontent-frontend:v1.0.0

# Pour rollback
docker-compose down
# Modifier docker-compose.yml pour utiliser le tag :v1.0.0
docker-compose up -d
```

---

## 🔐 Sauvegardes

### Fichiers critiques à sauvegarder

```bash
# Fichier .env (CRITIQUE)
cp .env .env.backup

# Logs importants
docker exec nexus-recontent-api tar czf /tmp/logs.tar.gz /app/logs
docker cp nexus-recontent-api:/tmp/logs.tar.gz ./backups/logs-$(date +%Y%m%d).tar.gz
```

---

## 📱 Watchtower - Mises à jour automatiques

Si vous utilisez Watchtower pour les mises à jour automatiques :

```bash
# Vérifier que Watchtower est actif
docker ps | grep watchtower

# Les labels sont déjà configurés dans docker-compose.yml
# Watchtower mettra à jour automatiquement si vous push de nouvelles images
```

---

## 📞 Support

En cas de problème :

1. Vérifier les logs : `docker-compose logs -f`
2. Vérifier le statut : `docker-compose ps`
3. Consulter [SECURITY.md](SECURITY.md) pour les tests de sécurité
4. Consulter [README.md](README.md) pour la documentation générale

**Contact :** matthieu.alix@example.com

---

**Dernière mise à jour :** 2025-10-23
**Version :** 1.0.0
