# Configuration Docker Compose - ReContent

**Date:** 28 octobre 2025
**Version:** 1.1 (mise à jour le 12 novembre 2026 : retrait de la configuration Nexus, ajout du fichier de production)

---

## Vue d'ensemble

ReContent utilise **3 fichiers docker-compose** :

```
recontent/
├── docker-compose.dev.yml     (Dev PC, pas de Traefik)
├── docker-compose.yml         (Traefik en HTTP : tests locaux et CI)
└── docker-compose.prod.yml    (Prod VPS, Traefik HTTPS)
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

## 2. docker-compose.yml

**Usage :** Tests locaux avec Traefik en HTTP, et tests d'intégration de la CI (GitHub Actions)
**Commande :** `docker compose up -d recontent-api nginx-recontent`

### Caractéristiques

- **Network :**
  - Interne : `recontent-network`
  - Externe : `traefik-network`
- **Traefik :**
  - Domaine : `recontent.localhost` (HTTP, entrypoint `web`, pas de HTTPS)
  - La CI appelle Traefik avec `-H "Host: recontent.localhost"`
- **Services :** `recontent-api`, `nginx-recontent` (frontend buildé servi par nginx)

### Quand l'utiliser

- ✅ Valider le routage via Traefik en local
- ✅ Tests d'intégration de la CI
- ❌ Pas pour dev rapide (utiliser docker-compose.dev.yml)
- ❌ Pas pour la production (utiliser docker-compose.prod.yml)

---

## 3. docker-compose.prod.yml

**Usage :** Production VPS
**Commande :** `docker compose up -d --build` (sélectionné par `COMPOSE_FILE` dans le `.env` du VPS, non versionné)

### Caractéristiques

- **Network :**
  - Interne : `nexus-recontent` (nom historique conservé : il correspond au réseau déjà existant sur le VPS)
  - Externe : `traefik-network`
- **Ports exposés :** ❌ Non (Traefik only)
- **Traefik :**
  - **Frontend :** `recontent.devamalix.fr` → port 80
  - **API :** `recontent.devamalix.fr/api` → port 3002, rewrite `/api/recontent/*` → `/*`
  - EntryPoint : `websecure` (HTTPS:443), TLS `certresolver=letsencrypt`
  - Security headers : HSTS complets
- **Conteneurs :** `nexus-recontent-api`, `nexus-recontent-frontend`
- **Images :** tags figés (`recontent-api:20261108`, `recontent-frontend:20261108`)
- **NODE_ENV :** production

### Déploiement

Par la CI à chaque push sur `main` (workflow GitHub Actions). Aucune modification directe dans `~/recontent`.

---

## Workflow de déploiement

```
PC dev
    ↓
  docker-compose.dev.yml
    ↓ (branche, PR, CI)
  docker-compose.yml  ← tests d'intégration CI (Traefik HTTP)
    ↓ (merge sur main)
VPS (main)
    ↓
  docker-compose.prod.yml  ← Production
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

### VPS (prod)

```bash
# SSH vers VPS
ssh ubuntu@37.59.115.242

# Aller dans le projet
cd ~/recontent

# Mettre à jour (déployé par la CI ; à la main : après fusion sur main)
git pull --ff-only

# Démarrer (fichier de prod via COMPOSE_FILE)
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
| **yml** (base) | Local / CI | recontent.localhost | ❌ | ❌ Traefik | Tests d'intégration |
| **prod.yml** | VPS (prod) | recontent.devamalix.fr | ✅ | ❌ Traefik | Production |

---

## Troubleshooting

### Port 3002 déjà utilisé (dev.yml)

```bash
# Vérifier quel process utilise le port
sudo lsof -i :3002

# Arrêter l'ancien container
docker compose -f docker-compose.dev.yml down
```

### Traefik ne détecte pas le service

```bash
# Vérifier que traefik-network existe
docker network ls | grep traefik

# Créer si manquant
docker network create traefik-network

# Vérifier labels (prod)
docker inspect nexus-recontent-api | grep traefik
```

### Certificat SSL non généré (VPS)

```bash
# Vérifier DNS
nslookup recontent.devamalix.fr

# Voir logs Traefik
docker logs traefik 2>&1 | grep -i acme

# Attendre 1-2 minutes pour génération auto
```

---

**Auteur :** MatthALXdev
**Dernière mise à jour :** 12 novembre 2026
**Version ReContent :** 1.2.0
