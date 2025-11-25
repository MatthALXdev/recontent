# Configuration Docker Compose - ReContent

**Date:** 28 octobre 2025
**Version:** 1.0

---

## Vue d'ensemble

ReContent utilise **3 fichiers docker-compose** pour gérer différents environnements :

```
recontent/
├── docker-compose.dev.yml     (Dev PC, pas de Traefik)
├── docker-compose.nexus.yml   (Test Nexus, Traefik HTTP)
└── docker-compose.yml         (Prod VPS, Traefik HTTPS)
```

---

## 1. docker-compose.dev.yml

**Usage :** Développement rapide sur PC
**Commande :** `docker compose -f docker-compose.dev.yml up`

### Caractéristiques

- **Network :** Interne uniquement (`nexus-recontent-dev`)
- **Ports exposés :**
  - API : `3002:3002`
  - Frontend : `8090:80`
- **Traefik :** ❌ Pas de labels
- **NODE_ENV :** development
- **Images :** `recontent-api:dev`, `recontent-frontend:dev`

### Quand l'utiliser

- Développement rapide sur PC personnel
- Tests sans infrastructure Traefik
- Itérations rapides (hot reload)
- Accès direct via `http://localhost:8090`

---

## 2. docker-compose.nexus.yml

**Usage :** Test local avec Traefik HTTP
**Commande :** `docker compose -f docker-compose.nexus.yml up -d`

**📅 Ajouté le :** 28 octobre 2025
**🎯 Objectif :** Reproduire l'architecture VPS en local pour tests pré-production

### Caractéristiques

- **Network :**
  - Interne : `nexus-recontent`
  - Externe : `traefik-network` (partagé avec autres services)
- **Ports exposés :** ❌ Non (Traefik only)
- **Traefik :**
  - **Frontend :** `recontent.nexus.local` → port 80
  - **API :** `recontent.nexus.local/api` → port 3002
  - EntryPoint : `web` (HTTP, pas HTTPS)
  - Middleware : rewrite `/api/recontent/*` → `/*`
  - Priority : 100 pour API (route avant frontend)
- **NODE_ENV :** production
- **Images :** `recontent-api:nexus`, `recontent-frontend:nexus`

### Différences vs VPS

| Aspect | Nexus | VPS |
|--------|-------|-----|
| Domain | `recontent.nexus.local` | `recontent.devamalix.fr` |
| EntryPoint | `web` (HTTP) | `websecure` (HTTPS) |
| TLS | ❌ Non | ✅ Let's Encrypt |
| HSTS headers | Désactivés | Activés (31536000s) |
| Watchtower | Désactivé | Activé |

### Quand l'utiliser

- ✅ Tester config Traefik avant déploiement VPS
- ✅ Valider routing frontend/API
- ✅ Valider middleware de rewrite
- ✅ Tester architecture identique à prod (sans HTTPS)
- ❌ Pas pour dev rapide (utiliser docker-compose.dev.yml)

---

## 3. docker-compose.yml

**Usage :** Production VPS
**Commande :** `docker compose up -d` (fichier par défaut)

### Caractéristiques

- **Network :**
  - Interne : `nexus-recontent`
  - Externe : `traefik-network`
- **Ports exposés :** ❌ Non (Traefik only, sécurité)
- **Traefik :**
  - **Frontend :** `recontent.devamalix.fr` → port 80
  - **API :** `recontent.devamalix.fr/api` → port 3002
  - EntryPoint : `websecure` (HTTPS:443)
  - TLS : `certresolver=letsencrypt` (auto-certificat)
  - Security headers : HSTS complets
  - Watchtower : auto-update activé
- **NODE_ENV :** production
- **Images :** `recontent-api:latest`, `recontent-frontend:latest`

### Quand l'utiliser

- Production sur VPS (37.59.115.242)
- Déploiement final avec HTTPS
- Environnement clients réels

---

## Workflow de déploiement

```
PC dev (develop-extern)
    ↓
  docker-compose.dev.yml
    ↓ (git push)
Nexus (develop-home)
    ↓
  docker-compose.nexus.yml  ← Test pré-prod
    ↓ (git merge → main)
VPS (main)
    ↓
  docker-compose.yml  ← Production
```

---

## Commandes utiles

### Dev (PC)

```bash
# Démarrer en mode dev
docker compose -f docker-compose.dev.yml up

# Rebuild après changement code
docker compose -f docker-compose.dev.yml up --build

# Arrêter
docker compose -f docker-compose.dev.yml down
```

### Nexus (test)

```bash
# SSH vers Nexus
ssh matth@nexus.local

# Aller dans le projet
cd /home/matth/nexus/dev-web/recontent

# Pull dernières modifs
git pull origin develop-home

# Démarrer avec config Nexus
docker compose -f docker-compose.nexus.yml up -d --build

# Voir logs
docker compose -f docker-compose.nexus.yml logs -f

# Arrêter
docker compose -f docker-compose.nexus.yml down
```

### VPS (prod)

```bash
# SSH vers VPS
ssh ubuntu@37.59.115.242

# Aller dans le projet
cd ~/recontent

# Pull dernières modifs
git pull origin main

# Démarrer (utilise docker-compose.yml par défaut)
docker compose up -d --build

# Voir logs
docker compose logs -f

# Arrêter
docker compose down
```

---

## Tableau récapitulatif

| Fichier | Environnement | Domain | HTTPS | Ports exposés | Utilisation |
|---------|---------------|--------|-------|---------------|-------------|
| **dev.yml** | PC local | localhost | ❌ | ✅ 3002, 8090 | Dev rapide |
| **nexus.yml** | Nexus (test) | recontent.nexus.local | ❌ | ❌ Traefik | Test pré-prod |
| **yml** (défaut) | VPS (prod) | recontent.devamalix.fr | ✅ | ❌ Traefik | Production |

---

## Migration d'une config à l'autre

### Nexus → VPS

Modifications nécessaires dans les labels Traefik :

```yaml
# AVANT (Nexus)
- "traefik.http.routers.recontent-api-nexus.rule=Host(`recontent.nexus.local`) && PathPrefix(`/api`)"
- "traefik.http.routers.recontent-api-nexus.entrypoints=web"

# APRÈS (VPS)
- "traefik.http.routers.recontent-api.rule=Host(`recontent.devamalix.fr`) && PathPrefix(`/api`)"
- "traefik.http.routers.recontent-api.entrypoints=websecure"
- "traefik.http.routers.recontent-api.tls.certresolver=letsencrypt"
```

**✅ Avec les 3 fichiers, plus besoin de modifier manuellement !**

---

## Troubleshooting

### Port 3002 déjà utilisé (dev.yml)

```bash
# Vérifier quel process utilise le port
sudo lsof -i :3002

# Arrêter l'ancien container
docker compose -f docker-compose.dev.yml down
```

### Traefik ne détecte pas le service (nexus.yml)

```bash
# Vérifier que traefik-network existe
docker network ls | grep traefik

# Créer si manquant
docker network create traefik-network

# Vérifier labels
docker inspect nexus-recontent-api | grep traefik
```

### Certificat SSL non généré (VPS)

```bash
# Vérifier DNS
nslookup recontent.devamalix.fr

# Voir logs Traefik
cd ~/traefik
docker compose logs | grep letsencrypt

# Attendre 1-2 minutes pour génération auto
```

---

**Auteur :** MatthALXdev
**Dernière mise à jour :** 28 octobre 2025
**Version ReContent :** 1.2.0
