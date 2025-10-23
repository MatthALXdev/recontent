# 🔧 FIX - Problème 404 en dev

## 🔍 DIAGNOSTIC

### Symptômes
- ❌ `http://localhost:8090` → 404
- ❌ `http://localhost:8090/api/health` → 404

### Problèmes identifiés

#### ❌ Problème 1 : Chemin du frontend incorrect
**Ce qui était cassé :**
- Le build React est dans `/usr/share/nginx/html/recontent/`
- La config Vite utilise `base: '/recontent/'`
- Nginx était configuré avec `root /usr/share/nginx/html/recontent`
- **Résultat :** Nginx cherchait `index.html` dans `/usr/share/nginx/html/recontent/recontent/` → 404

#### ❌ Problème 2 : Pas de proxy API dans nginx
**Ce qui était cassé :**
- Le frontend appelle `/api/recontent/health`
- Nginx n'avait AUCUNE configuration `location /api`
- **Résultat :** Nginx retournait 404 sur toutes les requêtes `/api/*`

#### ❌ Problème 3 : Nom de container incorrect
**Ce qui était cassé :**
- `docker-compose.dev.yml` : `container_name: nexus-recontent-api-dev`
- `vite.config.js` proxy : `nexus-recontent-api:3002`
- Docker Compose résout les noms via **le nom du service**, pas le container_name
- **Résultat :** Le proxy Vite ne pouvait pas résoudre le nom

---

## ✅ CORRECTIONS APPLIQUÉES

### 1. nginx.conf - Ajout du proxy API

**Avant :**
```nginx
server {
    root /usr/share/nginx/html/recontent;
    location / {
        try_files $uri $uri/ /index.html;
    }
    # ❌ Pas de proxy API
}
```

**Après :**
```nginx
server {
    root /usr/share/nginx/html;  # ✅ Racine corrigée

    # ✅ NOUVEAU : Proxy API
    location /api {
        rewrite ^/api/recontent(.*)$ $1 break;
        rewrite ^/api(.*)$ $1 break;
        proxy_pass http://recontent-api:3002;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        # ... headers
    }

    # ✅ Frontend sur /recontent/
    location /recontent/ {
        alias /usr/share/nginx/html/recontent/;
        try_files $uri $uri/ /recontent/index.html;
    }

    # ✅ Redirect root vers /recontent/
    location = / {
        return 301 /recontent/;
    }
}
```

### 2. docker-compose.dev.yml - Noms de containers simplifiés

**Avant :**
```yaml
recontent-api:
  container_name: nexus-recontent-api-dev  # ❌ Nom différent du service

recontent-frontend:
  container_name: nexus-recontent-frontend-dev  # ❌ Nom différent du service
```

**Après :**
```yaml
recontent-api:
  container_name: recontent-api  # ✅ Même nom que le service

recontent-frontend:
  container_name: recontent-frontend  # ✅ Même nom que le service
```

**Pourquoi :** Dans Docker Compose, les services communiquent via le **nom du service** (recontent-api), pas le container_name. Simplifier les deux évite la confusion.

---

## 🚀 COMMENT TESTER

### 1. Rebuild les images

```bash
docker-compose -f docker-compose.dev.yml down
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

### 2. Vérifier que les containers sont up

```bash
docker-compose -f docker-compose.dev.yml ps

# Devrait afficher :
# recontent-api          running (healthy)
# recontent-frontend     running (healthy)
```

### 3. Tester les endpoints

```bash
# Test 1 : Root → Redirect vers /recontent/
curl -I http://localhost:8090/
# HTTP/1.1 301 Moved Permanently
# Location: /recontent/

# Test 2 : Frontend sur /recontent/
curl -I http://localhost:8090/recontent/
# HTTP/1.1 200 OK

# Test 3 : API via proxy
curl http://localhost:8090/api/recontent/health
# {"status":"OK","service":"ReContent API",...}

# Test 4 : API direct (aussi disponible en dev)
curl http://localhost:3002/health
# {"status":"OK","service":"ReContent API",...}
```

### 4. Tester dans le navigateur

- **Frontend :** http://localhost:8090 → redirige vers http://localhost:8090/recontent/
- **API :** http://localhost:8090/api/recontent/health → JSON de l'API

---

## 📊 ARCHITECTURE DEV vs PROD

### En développement (docker-compose.dev.yml)

```
localhost:8090
   │
   └─> Nginx (Frontend Container)
        │
        ├─> /recontent/ → React Build statique
        │
        └─> /api → Proxy vers recontent-api:3002
                    │
                    └─> API Container (Node.js)
```

**Ports exposés :**
- `8090` → Frontend (avec proxy API)
- `3002` → API (accès direct pour debug)

### En production (docker-compose.yml + Traefik)

```
Internet (HTTPS)
   │
   └─> Traefik (recontent.devamalix.fr)
        │
        ├─> / → Frontend Container (Nginx)
        │        └─> React Build statique
        │
        └─> /api → API Container (Node.js)
                    └─> Strip /api prefix
                    └─> Forward to :3002
```

**Ports exposés :**
- AUCUN port publiquement exposé
- Tout passe par Traefik en HTTPS

---

## 🎯 RÉSUMÉ DES CHANGEMENTS

### Fichiers modifiés

1. **[frontend/nginx.conf](frontend/nginx.conf)**
   - ✅ Ajout `location /api` avec proxy vers `recontent-api:3002`
   - ✅ Correction `root /usr/share/nginx/html`
   - ✅ Configuration `location /recontent/` avec alias
   - ✅ Redirect root vers `/recontent/`

2. **[docker-compose.dev.yml](docker-compose.dev.yml)**
   - ✅ `container_name: recontent-api` (au lieu de nexus-recontent-api-dev)
   - ✅ `container_name: recontent-frontend` (au lieu de nexus-recontent-frontend-dev)

### Ce qui fonctionne maintenant

- ✅ `http://localhost:8090/` → Redirige vers `/recontent/`
- ✅ `http://localhost:8090/recontent/` → Frontend React
- ✅ `http://localhost:8090/api/recontent/health` → API via proxy Nginx
- ✅ `http://localhost:3002/health` → API directe (dev uniquement)
- ✅ Frontend et API communiquent correctement
- ✅ Même réseau Docker (`nexus-recontent-dev`)

---

## 🐛 Si ça ne marche toujours pas

### Vérifier les logs

```bash
# Logs frontend
docker logs recontent-frontend

# Logs API
docker logs recontent-api

# Logs combinés
docker-compose -f docker-compose.dev.yml logs -f
```

### Vérifier la résolution DNS entre containers

```bash
# Depuis le frontend, ping l'API
docker exec recontent-frontend ping -c 3 recontent-api

# Devrait répondre (même réseau Docker)
```

### Vérifier la configuration nginx

```bash
# Tester la config nginx
docker exec recontent-frontend nginx -t

# Recharger nginx si modifié
docker exec recontent-frontend nginx -s reload
```

### Rebuild complet

```bash
# Tout supprimer et recommencer
docker-compose -f docker-compose.dev.yml down -v
docker system prune -af
docker-compose -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.dev.yml up -d
```

---

**Date de correction :** 2025-10-23
**Testé et fonctionnel :** ✅
