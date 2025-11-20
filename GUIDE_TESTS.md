# 📊 État des Lieux du Projet Recontent & Guide d'Implémentation des Tests

## 🏗️ Architecture Globale

Le projet **Recontent** est une application fullstack dockerisée composée de 3 services principaux :

```
┌──────────────────────────────────────────────────┐
│          Nginx (Port 8090)                       │
│  - Reverse Proxy                                 │
│  - Serveur de fichiers statiques                 │
└─────────┬────────────────────────────────────────┘
          │
          ├─ /recontent/ → Frontend React (SPA)
          │
          └─ /api/recontent/ → API Node.js (Port 3002)
                                 │
                                 └─ Proxy → Mistral AI API
```

### **Technologies Utilisées**

**Frontend:**
- React 19.1.1
- Vite 7.1.7 (build tool)
- React Router DOM 7.9.3
- Axios pour les appels API
- Tailwind CSS 4.1.14
- Lucide React (icônes)

**Backend (API):**
- Node.js 20
- Express 4.18.2
- Axios 1.6.2
- Dotenv (variables d'environnement)
- CORS

**Infrastructure:**
- Docker Compose
- Nginx (reverse proxy)
- Images Alpine Linux

---

## 📂 Structure du Projet

```
recontent/
├── api/
│   ├── index.js                  # API Express principale
│   └── package.json              # Dépendances backend
│
├── frontend/
│   ├── src/
│   │   ├── components/           # Composants React réutilisables
│   │   │   ├── Header.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   ├── CopyButton.jsx
│   │   │   ├── ResultCard.jsx
│   │   │   ├── ResultsTabs.jsx
│   │   │   ├── TwitterThreadCard.jsx
│   │   │   ├── MarkdownPreview.jsx
│   │   │   └── common/ConfirmModal.jsx
│   │   │
│   │   ├── pages/                # Pages de l'application
│   │   │   ├── Home.jsx          # Page principale avec génération
│   │   │   ├── Profile.jsx       # Configuration profil utilisateur
│   │   │   └── History.jsx       # Historique des générations
│   │   │
│   │   ├── services/             # Logique métier
│   │   │   ├── mistralAPI.js     # Service API (appels backend)
│   │   │   └── storage.js        # Service LocalStorage
│   │   │
│   │   ├── contexts/
│   │   │   └── ToastContext.jsx  # Context pour notifications
│   │   │
│   │   ├── utils/
│   │   │   └── constants.js      # Constantes (limites plateformes)
│   │   │
│   │   ├── App.jsx               # Composant racine
│   │   └── main.jsx              # Point d'entrée
│   │
│   ├── vite.config.js
│   └── package.json
│
├── nginx/
│   └── recontent.conf
│
├── docker-compose.yml
└── .env
```

---

## 🔍 Analyse Détaillée des Composants Clés

### **1. API Backend (index.js)**

#### **Endpoints:**

| Route | Méthode | Description |
|-------|---------|-------------|
| `/health` | GET | Health check de l'API + vérification config Mistral |
| `/generate` | POST | Génération multi-plateformes via Mistral AI |
| `/repurpose` | POST | Route legacy pour compatibilité |

#### **Logique de `/generate` (lignes 32-240):**

**Ce qui est testé et pourquoi:**

1. **Validation des inputs (lignes 36-46):**
   - `content` (string) obligatoire
   - `platforms` (array) obligatoire et non vide
   - `profile` (object) optionnel

   **Pourquoi:** Éviter les erreurs silencieuses et guider l'utilisateur

2. **Vérification de la clé API Mistral (lignes 48-53):**
   ```javascript
   if (!MISTRAL_API_KEY || MISTRAL_API_KEY === 'your_mistral_api_key_here') {
     return res.status(500).json({ error: 'Mistral API key not configured' });
   }
   ```
   **Pourquoi:** La clé API est critique, on doit échouer rapidement si absente

3. **Boucle de génération par plateforme (lignes 89-208):**
   - Pour chaque plateforme sélectionnée
   - Construction d'un prompt spécifique
   - Appel à la fonction helper `callMistral()`
   - Gestion des erreurs par plateforme (try/catch interne)

   **Pourquoi:** Si une plateforme échoue, les autres continuent

4. **Fonction `callMistral()` (lignes 73-86):**
   ```javascript
   const callMistral = async (prompt, maxTokens = 1200) => {
     const response = await axios.post(MISTRAL_API_URL, {
       model: 'mistral-small-latest',
       messages: [{ role: 'user', content: prompt }],
       max_tokens: maxTokens
     }, {
       headers: { 'Authorization': `Bearer ${MISTRAL_API_KEY}` },
       timeout: 30000
     });
     return response.data.choices[0].message.content;
   };
   ```
   **Pourquoi tester:** C'est le proxy central vers Mistral
   - Timeout de 30s
   - Gestion des headers d'authentification
   - Extraction du contenu de la réponse

5. **Gestion des erreurs globales (lignes 217-239):**
   - Erreur Mistral API (code HTTP de Mistral)
   - Timeout (`ECONNABORTED`)
   - Erreur générique

   **Pourquoi:** Feedback précis à l'utilisateur selon le type d'erreur

#### **Architecture de prompts:**

Chaque plateforme a un prompt spécifique (lignes 94-196):
- **Twitter:** Thread 8-12 tweets, 280 chars max, numérotés
- **LinkedIn:** Post 1300 chars, markdown, hashtags
- **Dev.to:** Article 500-800 mots, markdown structuré
- **GitHub:** README.md professionnel
- **Newsletter:** Email 300-500 mots

**Pourquoi cette archi:** Séparation des préoccupations, chaque plateforme a ses contraintes

---

### **2. Service Frontend `mistralAPI.js`**

#### **Fonction `generateContent()` (lignes 13-61):**

**Flux:**
```
1. Récupère le profil depuis localStorage
2. Appelle POST /api/recontent/generate
3. Timeout 60s (multi-plateformes = long)
4. Gestion d'erreurs détaillée
```

**Points à tester:**
- Appel axios avec bon endpoint
- Headers `Content-Type: application/json`
- Gestion des erreurs HTTP (error.response)
- Gestion timeout (error.code === 'ECONNABORTED')
- Gestion absence de réponse (error.request)

**Pourquoi:** Service critique qui fait le pont frontend-backend

#### **Fonction `checkAPIHealth()` (lignes 67-77):**

**Flux:**
```
GET /api/recontent/health
Timeout 5s
```

**Pourquoi tester:** Permet de vérifier la disponibilité de l'API au démarrage

---

### **3. Composant `Home.jsx` (Page principale)**

#### **State Management (lignes 9-22):**

```javascript
const [content, setContent] = useState('');
const [platforms, setPlatforms] = useState({...});
const [results, setResults] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [history, setHistory] = useState(() => storage.get('history') || []);
```

**Logique Métier:**

1. **`handlePlatformToggle()` (lignes 24-26):**
   - Toggle sélection plateforme
   - **Pourquoi tester:** Interface principale de sélection

2. **`addToHistory()` (lignes 28-39):**
   - Ajoute génération à l'historique
   - Limite à 20 dernières
   - Sauvegarde dans localStorage
   - **Pourquoi tester:** Persistance des données utilisateur

3. **`handleGenerate()` (lignes 41-88):**
   - **Validation** (lignes 47-65):
     - Contenu ≥ 100 caractères
     - Au moins 1 plateforme sélectionnée
     - Affiche erreur + animation shake si invalide

   - **Appel API** (lignes 72-73):
     ```javascript
     const selectedPlatforms = Object.keys(platforms).filter(p => platforms[p]);
     const data = await generateContent(content, selectedPlatforms);
     ```

   - **Gestion succès** (lignes 74-81):
     - Set results
     - Ajoute à l'historique

   - **Gestion erreur** (lignes 82-87):
     - Log console
     - Affiche message d'erreur

**Pourquoi tester ce composant:**
- Logique de validation complexe
- Interaction avec localStorage
- Gestion d'états asynchrones (loading, error, results)

---

### **4. Composant `ResultsTabs.jsx`**

#### **Logique (lignes 14-60):**

```javascript
const [activeTab, setActiveTab] = useState(Object.keys(results)[0]);
```

**Rendu:**
1. Header avec onglets (lignes 28-52)
   - Map sur les plateformes dans `results`
   - Change activeTab au clic
   - Style différent selon plateforme

2. Contenu (lignes 54-58)
   - Affiche `<ResultCard>` pour l'onglet actif

**Points à tester:**
- Initialisation du bon onglet (premier dans results)
- Changement d'onglet au clic
- Affichage du bon contenu selon l'onglet
- Gestion des icônes et couleurs par plateforme

**Pourquoi:** Composant de présentation central, interface principale des résultats

---

### **5. Service `storage.js`**

**3 fonctions:**
- `save(key, data)` - Sauvegarde dans localStorage
- `get(key)` - Récupère depuis localStorage
- `remove(key)` - Supprime une clé

**Gestion d'erreurs:** Try/catch avec console.error

**Pourquoi tester:**
- Service utilisé partout (profil, historique)
- Gestion des erreurs de parsing JSON
- Gestion localStorage non disponible (mode privé)

---

## 🧪 Guide d'Implémentation Séquencé des Tests

### **Phase 1: Architecture Tests (1h)**

#### **Choix Framework: Vitest vs Jest**

**Recommandation: Vitest**

**Pourquoi:**
1. ✅ Natif Vite (déjà utilisé dans le projet)
2. ✅ Syntaxe compatible Jest (migration facile)
3. ✅ Plus rapide (utilise esbuild)
4. ✅ Support ESM out-of-the-box
5. ✅ Watch mode optimisé
6. ✅ UI de test intégrée

**Comparaison:**

| Critère | Vitest | Jest |
|---------|--------|------|
| Vitesse | ⚡⚡⚡ | ⚡⚡ |
| Config Vite | Native | Nécessite babel |
| ESM | Native | Expérimental |
| Watch mode | Optimisé | Standard |
| UI | Intégrée | Externe |

#### **Structure dossiers tests**

```
recontent/
├── api/
│   ├── __tests__/              # Tests API
│   │   ├── health.test.js      # Tests endpoint /health
│   │   ├── generate.test.js    # Tests endpoint /generate
│   │   └── helpers/
│   │       └── setup.js        # Setup commun (mocks, etc.)
│   ├── index.js
│   ├── package.json
│   └── vitest.config.js        # Config Vitest backend
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── __tests__/      # Tests composants
│   │   │   │   ├── ResultsTabs.test.jsx
│   │   │   │   ├── CopyButton.test.jsx
│   │   │   │   └── LoadingSpinner.test.jsx
│   │   │   └── ResultsTabs.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── __tests__/      # Tests pages
│   │   │   │   └── Home.test.jsx
│   │   │   └── Home.jsx
│   │   │
│   │   ├── services/
│   │   │   ├── __tests__/      # Tests services
│   │   │   │   ├── mistralAPI.test.js
│   │   │   │   └── storage.test.js
│   │   │   ├── mistralAPI.js
│   │   │   └── storage.js
│   │   │
│   │   └── utils/
│   │       └── __tests__/
│   │           └── constants.test.js
│   │
│   ├── vitest.config.js        # Config Vitest frontend
│   ├── vitest.setup.js         # Setup global (jsdom, etc.)
│   └── package.json
│
└── .github/
    └── workflows/
        └── ci.yml              # GitHub Actions workflow
```

#### **Setup Config Vitest**

**1. Installation dépendances frontend:**

```bash
cd frontend
npm install -D vitest @vitest/ui @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

**2. Installation dépendances backend:**

```bash
cd api
npm install -D vitest supertest
```

**3. Configuration `frontend/vitest.config.js`:**

```javascript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.js',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.config.js',
        '**/main.jsx'
      ]
    }
  }
});
```

**4. Configuration `frontend/vitest.setup.js`:**

```javascript
import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Cleanup après chaque test
afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
global.localStorage = localStorageMock;
```

**5. Configuration `api/vitest.config.js`:**

```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: './__tests__/helpers/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        '__tests__/'
      ]
    }
  }
});
```

**6. Ajouter scripts dans `package.json`:**

**Frontend:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

**Backend:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

---

### **Phase 2: Tests Unitaires API (1h)**

#### **Test 1: Endpoint `/health`**

**Fichier:** `api/__tests__/health.test.js`

```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

// Import du code à tester (on va refactorer index.js pour exporter app)
let app, server;

beforeAll(() => {
  // Setup serveur test
  app = express();
  // ... configuration middleware

  app.get('/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      service: 'ReContent API',
      timestamp: expect.any(String),
      mistral_configured: true
    });
  });

  server = app.listen(0); // Port aléatoire
});

afterAll(() => {
  server.close();
});

describe('GET /health', () => {
  it('devrait retourner status 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
  });

  it('devrait retourner la structure JSON correcte', async () => {
    const response = await request(app).get('/health');

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('service', 'ReContent API');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('mistral_configured');
  });

  it('devrait retourner un timestamp ISO valide', async () => {
    const response = await request(app).get('/health');

    expect(() => new Date(response.body.timestamp)).not.toThrow();
  });

  it('devrait indiquer mistral_configured=false si clé absente', async () => {
    // Test avec clé vide (mock env)
    // ... à implémenter avec dotenv-mock
  });
});
```

**Pourquoi ces tests:**
- Vérifie que l'endpoint répond (disponibilité)
- Vérifie le format de réponse (contrat API)
- Vérifie la logique de vérification de la clé Mistral

---

#### **Test 2: Proxy Mistral - Endpoint `/generate`**

**Fichier:** `api/__tests__/generate.test.js`

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import axios from 'axios';

// Mock axios pour ne pas appeler Mistral réellement
vi.mock('axios');

describe('POST /generate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Validation des inputs', () => {
    it('devrait rejeter si content manquant', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ platforms: ['twitter'] });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    it('devrait rejeter si platforms manquant', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: 'Test content' });

      expect(response.status).toBe(400);
    });

    it('devrait rejeter si platforms est vide', async () => {
      const response = await request(app)
        .post('/generate')
        .send({ content: 'Test', platforms: [] });

      expect(response.status).toBe(400);
    });

    it('devrait accepter profile optionnel', async () => {
      // Mock Mistral response
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Mocked response' } }]
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: 'Test content',
          platforms: ['twitter'],
          profile: { name: 'Test User', tone: 'casual' }
        });

      expect(response.status).toBe(200);
    });
  });

  describe('Appel à Mistral AI', () => {
    it('devrait appeler Mistral avec les bons headers', async () => {
      axios.post.mockResolvedValue({
        data: {
          choices: [{ message: { content: 'Thread Twitter...' } }]
        }
      });

      await request(app)
        .post('/generate')
        .send({
          content: 'My blog post about React',
          platforms: ['twitter']
        });

      // Vérifier que axios.post a été appelé
      expect(axios.post).toHaveBeenCalledWith(
        'https://api.mistral.ai/v1/chat/completions',
        expect.objectContaining({
          model: 'mistral-small-latest',
          messages: expect.any(Array),
          max_tokens: expect.any(Number)
        }),
        expect.objectContaining({
          headers: {
            'Authorization': expect.stringContaining('Bearer'),
            'Content-Type': 'application/json'
          },
          timeout: 30000
        })
      );
    });

    it('devrait générer un prompt spécifique pour Twitter', async () => {
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: '1/ Test thread' } }] }
      });

      await request(app)
        .post('/generate')
        .send({
          content: 'Content to repurpose',
          platforms: ['twitter']
        });

      const call = axios.post.mock.calls[0];
      const prompt = call[1].messages[0].content;

      expect(prompt).toContain('thread');
      expect(prompt).toContain('280 caractères');
      expect(prompt).toContain('8 à 12 tweets');
    });

    it('devrait générer des prompts différents pour plusieurs plateformes', async () => {
      axios.post.mockResolvedValue({
        data: { choices: [{ message: { content: 'Response' } }] }
      });

      await request(app)
        .post('/generate')
        .send({
          content: 'Multi-platform content',
          platforms: ['twitter', 'linkedin']
        });

      // axios.post devrait être appelé 2 fois
      expect(axios.post).toHaveBeenCalledTimes(2);
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer les erreurs Mistral API', async () => {
      axios.post.mockRejectedValue({
        response: {
          status: 401,
          data: { error: 'Invalid API key' }
        }
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: 'Test',
          platforms: ['twitter']
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Mistral API error');
    });

    it('devrait gérer les timeouts', async () => {
      axios.post.mockRejectedValue({
        code: 'ECONNABORTED'
      });

      const response = await request(app)
        .post('/generate')
        .send({
          content: 'Test',
          platforms: ['twitter']
        });

      expect(response.status).toBe(504);
      expect(response.body.error).toContain('timeout');
    });

    it('devrait continuer si une plateforme échoue', async () => {
      // Premier appel réussit, second échoue
      axios.post
        .mockResolvedValueOnce({
          data: { choices: [{ message: { content: 'Twitter OK' } }] }
        })
        .mockRejectedValueOnce(new Error('LinkedIn failed'));

      const response = await request(app)
        .post('/generate')
        .send({
          content: 'Test',
          platforms: ['twitter', 'linkedin']
        });

      expect(response.status).toBe(200);
      expect(response.body.results.twitter).toBe('Twitter OK');
      expect(response.body.results.linkedin).toHaveProperty('error');
    });
  });
});
```

**Pourquoi ces tests:**
1. **Validation:** Garantit que les mauvaises requêtes sont rejetées
2. **Proxy Mistral:** Vérifie que l'appel API est correct (headers, body, timeout)
3. **Prompts:** Vérifie la logique métier de génération de prompts
4. **Résilience:** Vérifie que les erreurs sont gérées proprement

---

#### **Test 3: Mocks API externes**

**Fichier:** `api/__tests__/helpers/setup.js`

```javascript
import { vi } from 'vitest';

// Mock global d'axios
vi.mock('axios', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn()
  }
}));

// Mock dotenv pour tester avec/sans clé API
export const mockEnv = (key, value) => {
  process.env[key] = value;
};

export const clearEnv = (key) => {
  delete process.env[key];
};

// Helpers pour mocker les réponses Mistral
export const mockMistralSuccess = (content) => {
  return {
    data: {
      choices: [
        {
          message: {
            content: content || 'Mocked Mistral response'
          }
        }
      ],
      usage: {
        prompt_tokens: 100,
        completion_tokens: 200
      }
    }
  };
};

export const mockMistralError = (status, message) => {
  return {
    response: {
      status: status,
      data: { error: message }
    }
  };
};
```

---

### **Phase 3: Tests Composants React (1h)**

#### **Test 1: Composant `ResultsTabs`**

**Fichier:** `frontend/src/components/__tests__/ResultsTabs.test.jsx`

```javascript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ResultsTabs from '../ResultsTabs';

const mockResults = {
  twitter: '1/ This is a thread\n2/ Second tweet',
  linkedin: 'Professional LinkedIn post',
  devto: '# Article Title\n\nContent here'
};

describe('ResultsTabs', () => {
  it('devrait afficher tous les onglets', () => {
    render(<ResultsTabs results={mockResults} />);

    expect(screen.getByText('X')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Dev.to')).toBeInTheDocument();
  });

  it('devrait activer le premier onglet par défaut', () => {
    render(<ResultsTabs results={mockResults} />);

    const twitterTab = screen.getByText('X').closest('button');
    expect(twitterTab).toHaveClass('text-blue-400'); // Classe active
  });

  it('devrait changer d\'onglet au clic', () => {
    render(<ResultsTabs results={mockResults} />);

    const linkedinTab = screen.getByText('LinkedIn');
    fireEvent.click(linkedinTab);

    // Vérifier que LinkedIn est maintenant actif
    expect(linkedinTab.closest('button')).toHaveClass('text-blue-600');
  });

  it('devrait afficher le contenu correspondant à l\'onglet actif', () => {
    const { container } = render(<ResultsTabs results={mockResults} />);

    // Par défaut, Twitter est actif
    expect(container.textContent).toContain('This is a thread');

    // Clic sur LinkedIn
    fireEvent.click(screen.getByText('LinkedIn'));
    expect(container.textContent).toContain('Professional LinkedIn post');
  });

  it('devrait afficher les bonnes icônes par plateforme', () => {
    render(<ResultsTabs results={mockResults} />);

    // Vérifier que les icônes Lucide sont rendues
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
  });
});
```

**Pourquoi ces tests:**
- Vérifie le rendu des onglets
- Vérifie l'état initial (premier onglet actif)
- Vérifie l'interaction utilisateur (changement d'onglet)
- Vérifie l'affichage du bon contenu

---

#### **Test 2: Composant `Home` (Page principale)**

**Fichier:** `frontend/src/pages/__tests__/Home.test.jsx`

```javascript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Home from '../Home';
import * as mistralAPI from '../../services/mistralAPI';
import * as storage from '../../services/storage';

// Mock des services
vi.mock('../../services/mistralAPI');
vi.mock('../../services/storage');

describe('Home - Sélection de plateformes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storage.storage.get.mockReturnValue([]);
  });

  it('devrait permettre de sélectionner une plateforme', async () => {
    render(<Home />);

    const twitterButton = screen.getByText('X').closest('button');
    await userEvent.click(twitterButton);

    // Vérifier que le bouton est actif
    expect(twitterButton).toHaveClass('bg-blue-500/20');
  });

  it('devrait permettre de désélectionner une plateforme', async () => {
    render(<Home />);

    const twitterButton = screen.getByText('X').closest('button');

    // Sélectionner
    await userEvent.click(twitterButton);
    expect(twitterButton).toHaveClass('bg-blue-500/20');

    // Désélectionner
    await userEvent.click(twitterButton);
    expect(twitterButton).toHaveClass('bg-dark-800');
  });

  it('devrait permettre de sélectionner plusieurs plateformes', async () => {
    render(<Home />);

    await userEvent.click(screen.getByText('X').closest('button'));
    await userEvent.click(screen.getByText('LinkedIn').closest('button'));

    expect(screen.getByText('X').closest('button')).toHaveClass('bg-blue-500/20');
    expect(screen.getByText('LinkedIn').closest('button')).toHaveClass('bg-blue-600/20');
  });
});

describe('Home - Saisie de contenu', () => {
  it('devrait afficher le compteur de caractères', () => {
    render(<Home />);

    expect(screen.getByText(/0 \/ 100/)).toBeInTheDocument();
  });

  it('devrait mettre à jour le compteur lors de la saisie', async () => {
    render(<Home />);

    const textarea = screen.getByPlaceholderText(/Click to expand/);
    await userEvent.type(textarea, 'Test content');

    expect(screen.getByText(/12 \/ 100/)).toBeInTheDocument();
  });

  it('devrait changer la couleur du compteur si < 100 caractères', async () => {
    render(<Home />);

    const counter = screen.getByText(/0 \/ 100/);
    expect(counter).toHaveClass('text-red-400');

    const textarea = screen.getByPlaceholderText(/Click to expand/);
    await userEvent.type(textarea, 'a'.repeat(100));

    await waitFor(() => {
      expect(screen.getByText(/100 \/ 100/)).toHaveClass('text-green-400');
    });
  });
});

describe('Home - Génération de contenu', () => {
  it('devrait afficher une erreur si aucune plateforme sélectionnée', async () => {
    render(<Home />);

    const textarea = screen.getByPlaceholderText(/Click to expand/);
    await userEvent.type(textarea, 'a'.repeat(100));

    const generateButton = screen.getByText('Generate Content');
    await userEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/sélectionner au moins une plateforme/)).toBeInTheDocument();
    });
  });

  it('devrait afficher une erreur si contenu < 100 caractères', async () => {
    render(<Home />);

    await userEvent.click(screen.getByText('X').closest('button'));

    const generateButton = screen.getByText('Generate Content');
    await userEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText(/au moins 100 caractères/)).toBeInTheDocument();
    });
  });

  it('devrait appeler l\'API avec les bonnes données', async () => {
    const mockGenerateContent = vi.fn().mockResolvedValue({
      twitter: 'Thread content'
    });
    mistralAPI.generateContent = mockGenerateContent;

    render(<Home />);

    const textarea = screen.getByPlaceholderText(/Click to expand/);
    await userEvent.type(textarea, 'a'.repeat(100));
    await userEvent.click(screen.getByText('X').closest('button'));

    const generateButton = screen.getByText('Generate Content');
    await userEvent.click(generateButton);

    await waitFor(() => {
      expect(mockGenerateContent).toHaveBeenCalledWith(
        'a'.repeat(100),
        ['twitter']
      );
    });
  });

  it('devrait afficher le spinner pendant le chargement', async () => {
    mistralAPI.generateContent.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ twitter: 'Content' }), 1000))
    );

    render(<Home />);

    const textarea = screen.getByPlaceholderText(/Click to expand/);
    await userEvent.type(textarea, 'a'.repeat(100));
    await userEvent.click(screen.getByText('X').closest('button'));

    const generateButton = screen.getByText('Generate Content');
    await userEvent.click(generateButton);

    expect(screen.getByText(/Génération en cours/)).toBeInTheDocument();
  });

  it('devrait afficher les résultats après génération', async () => {
    mistralAPI.generateContent.mockResolvedValue({
      twitter: '1/ Thread test'
    });

    render(<Home />);

    const textarea = screen.getByPlaceholderText(/Click to expand/);
    await userEvent.type(textarea, 'a'.repeat(100));
    await userEvent.click(screen.getByText('X').closest('button'));

    await userEvent.click(screen.getByText('Generate Content'));

    await waitFor(() => {
      expect(screen.getByText(/Thread test/)).toBeInTheDocument();
    });
  });

  it('devrait sauvegarder dans l\'historique après génération', async () => {
    const mockSave = vi.fn();
    storage.storage.save = mockSave;

    mistralAPI.generateContent.mockResolvedValue({
      twitter: 'Thread'
    });

    render(<Home />);

    const textarea = screen.getByPlaceholderText(/Click to expand/);
    await userEvent.type(textarea, 'a'.repeat(100));
    await userEvent.click(screen.getByText('X').closest('button'));
    await userEvent.click(screen.getByText('Generate Content'));

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalledWith(
        'history',
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.any(String),
            platforms: ['twitter'],
            results: expect.any(Object)
          })
        ])
      );
    });
  });
});
```

**Pourquoi ces tests:**
1. **Sélection plateformes:** Interface critique, doit fonctionner parfaitement
2. **Validation contenu:** Logique métier (min 100 chars)
3. **Appel API:** Vérifie que les bonnes données sont envoyées
4. **États asynchrones:** Loading, erreur, succès
5. **Persistance:** Historique sauvegardé

---

#### **Test 3: Service `storage.js`**

**Fichier:** `frontend/src/services/__tests__/storage.test.js`

```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage } from '../storage';

describe('storage.save()', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('devrait sauvegarder des données dans localStorage', () => {
    const data = { name: 'Test', age: 30 };
    storage.save('profile', data);

    const saved = localStorage.getItem('profile');
    expect(JSON.parse(saved)).toEqual(data);
  });

  it('devrait gérer les erreurs de stringify', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Objet circulaire
    const circular = {};
    circular.self = circular;

    storage.save('test', circular);

    expect(consoleError).toHaveBeenCalled();
  });
});

describe('storage.get()', () => {
  it('devrait récupérer des données depuis localStorage', () => {
    const data = { name: 'Test' };
    localStorage.setItem('profile', JSON.stringify(data));

    const result = storage.get('profile');
    expect(result).toEqual(data);
  });

  it('devrait retourner null si clé absente', () => {
    const result = storage.get('nonexistent');
    expect(result).toBeNull();
  });

  it('devrait gérer les erreurs de parsing JSON', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    localStorage.setItem('invalid', '{invalid json}');
    const result = storage.get('invalid');

    expect(result).toBeNull();
    expect(consoleError).toHaveBeenCalled();
  });
});

describe('storage.remove()', () => {
  it('devrait supprimer une clé', () => {
    localStorage.setItem('test', 'value');
    storage.remove('test');

    expect(localStorage.getItem('test')).toBeNull();
  });

  it('devrait gérer les erreurs de suppression', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock removeItem qui throw
    localStorage.removeItem = vi.fn(() => {
      throw new Error('Storage error');
    });

    storage.remove('test');
    expect(consoleError).toHaveBeenCalled();
  });
});
```

**Pourquoi ces tests:**
- Service utilisé partout
- Gestion d'erreurs critique (mode privé, quotas dépassés)
- Parsing JSON peut échouer

---

### **Phase 4: GitHub Actions Workflow (1h30)**

#### **Fichier:** `.github/workflows/ci.yml`

```yaml
name: CI/CD - Recontent Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-frontend:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run linter
        working-directory: ./frontend
        run: npm run lint

      - name: Run tests
        working-directory: ./frontend
        run: npm run test:run

      - name: Generate coverage
        working-directory: ./frontend
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./frontend/coverage/coverage-final.json
          flags: frontend
          name: frontend-coverage

  test-backend:
    name: Backend Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: api/package-lock.json

      - name: Install dependencies
        working-directory: ./api
        run: npm ci

      - name: Run tests
        working-directory: ./api
        run: npm run test:run
        env:
          MISTRAL_API_KEY: test_key_mock  # Mock pour tests

      - name: Generate coverage
        working-directory: ./api
        run: npm run test:coverage
        env:
          MISTRAL_API_KEY: test_key_mock

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          files: ./api/coverage/coverage-final.json
          flags: backend
          name: backend-coverage

  build-validation:
    name: Build Validation
    needs: [test-frontend, test-backend]
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install frontend dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Build frontend
        working-directory: ./frontend
        run: npm run build

      - name: Check build output
        run: |
          if [ ! -d "frontend/dist" ]; then
            echo "Build failed: dist folder not found"
            exit 1
          fi
          if [ ! -f "frontend/dist/index.html" ]; then
            echo "Build failed: index.html not found"
            exit 1
          fi
          echo "✅ Build successful"

      - name: Upload build artifacts
        uses: actions/upload-artifact@v4
        with:
          name: frontend-build
          path: frontend/dist
          retention-days: 7

  docker-test:
    name: Docker Compose Test
    needs: build-validation
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Create .env file
        run: |
          echo "MISTRAL_API_KEY=test_key_for_docker" > .env
          echo "API_PORT=3002" >> .env

      - name: Build Docker images
        run: docker compose build

      - name: Start services
        run: docker compose up -d

      - name: Wait for services
        run: |
          echo "Waiting for API to be ready..."
          timeout 30 bash -c 'until curl -f http://localhost:3002/health; do sleep 2; done'
          echo "Waiting for Nginx to be ready..."
          timeout 30 bash -c 'until curl -f http://localhost:8090/health; do sleep 2; done'

      - name: Test API health
        run: |
          response=$(curl -s http://localhost:3002/health)
          echo "API Response: $response"
          echo "$response" | grep -q '"status":"OK"' || exit 1

      - name: Test Frontend access
        run: |
          curl -I http://localhost:8090/recontent/ | grep "200 OK" || exit 1

      - name: Show logs on failure
        if: failure()
        run: docker compose logs

      - name: Cleanup
        if: always()
        run: docker compose down -v
```

**Pourquoi ce workflow:**
1. **Test frontend/backend séparément:** Isolation des tests
2. **Build validation:** Vérifie que le build ne casse pas
3. **Docker test:** Vérifie que l'infrastructure fonctionne
4. **Coverage:** Suivi de la couverture de code
5. **Artifacts:** Sauvegarde du build pour déploiement potentiel

---

### **Phase 5: Tests CI/CD (1h)**

#### **Checklist de validation:**

1. **Créer une branche de test:**
   ```bash
   git checkout -b test/ci-setup
   ```

2. **Pousser un commit test:**
   ```bash
   git add .
   git commit -m "test: Setup CI/CD pipeline with Vitest"
   git push origin test/ci-setup
   ```

3. **Vérifier le pipeline GitHub Actions:**
   - Aller sur GitHub → Actions
   - Vérifier que le workflow se lance
   - Vérifier chaque job (frontend, backend, build, docker)

4. **Tests de correction:**
   - Introduire un test qui échoue volontairement
   - Pousser → Vérifier que le pipeline échoue
   - Corriger le test
   - Pousser → Vérifier que le pipeline passe

5. **Vérifier les artifacts:**
   - Dans GitHub Actions, vérifier que `frontend-build` est uploadé

6. **Vérifier la coverage:**
   - Configurer Codecov (si souhaité)
   - Ou vérifier localement avec `npm run test:coverage`

---

## 📊 Résumé des Concepts Testés

### **Pourquoi ces lignes de code sont testées:**

| Composant | Lignes testées | Concept | Pourquoi |
|-----------|----------------|---------|----------|
| API `/health` | 22-29 | Health check | Monitoring de la disponibilité |
| API `/generate` validation | 36-46 | Validation inputs | Sécurité et prévention d'erreurs |
| API `callMistral()` | 73-86 | Proxy API externe | Point critique d'intégration |
| API Gestion erreurs | 217-239 | Error handling | UX et debugging |
| Frontend `Home.jsx` validation | 47-65 | Logique métier | Règles business (min 100 chars) |
| Frontend `storage.js` | 10-31 | Persistance | Données utilisateur critiques |
| Frontend `ResultsTabs` | 14-60 | Navigation UI | Interface principale |

### **Architecture de code expliquée:**

1. **Séparation Frontend/Backend:**
   - **Pourquoi:** Sécurité (clé API côté serveur), scalabilité, déploiement indépendant

2. **Service Layer (mistralAPI.js, storage.js):**
   - **Pourquoi:** Découplage, réutilisabilité, facilité de tests (mocking)

3. **Component-based React:**
   - **Pourquoi:** Réutilisabilité, composition, tests isolés

4. **Proxy Mistral dans l'API:**
   - **Pourquoi:** Sécurité (pas de clé API exposée), logging centralisé, gestion d'erreurs

5. **LocalStorage pour profil/historique:**
   - **Pourquoi:** Pas de backend de données nécessaire, simplicité MVP

---

## 🎯 Prochaines Étapes Recommandées

Pour implémenter cette stratégie de tests, suivre cet ordre :

### **Semaine 1:**
1. **Jour 1:** Setup Vitest (config + dépendances)
2. **Jour 2:** Tests API `/health` + setup mocks
3. **Jour 3:** Tests API `/generate` (validation + proxy)

### **Semaine 2:**
4. **Jour 1:** Tests composant `ResultsTabs`
5. **Jour 2:** Tests composant `Home` (partie validation)
6. **Jour 3:** Tests composant `Home` (partie génération)

### **Semaine 3:**
7. **Jour 1:** Tests services (`storage.js`, `mistralAPI.js`)
8. **Jour 2:** Setup GitHub Actions workflow
9. **Jour 3:** Tests CI/CD + corrections

---

## 💡 Points d'Attention

1. **Refactoring nécessaire:** Il faudra exporter `app` depuis `api/index.js` pour pouvoir le tester avec `supertest`

2. **Mocks localStorage:** Déjà configuré dans `vitest.setup.js`

3. **Coverage targets:** Viser 70% minimum pour passer en production

4. **Tests E2E:** Non couverts ici, mais à envisager avec Playwright/Cypress pour phase 3

---

## 📚 Ressources Supplémentaires

- **Vitest Documentation:** https://vitest.dev
- **Testing Library:** https://testing-library.com/docs/react-testing-library/intro/
- **Supertest:** https://github.com/ladjs/supertest
- **GitHub Actions:** https://docs.github.com/en/actions

---

**Document généré le:** 2025-11-19
**Version:** 1.0.0
**Auteur:** Matthieu Alix - Projet NEXUS
