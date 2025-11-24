// ===========================================
// ReContent API - Production Ready
// ===========================================
// Secure Node.js API with:
// - Winston logging
// - CORS whitelist
// - Rate limiting
// - Input validation
// - Proper error handling

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const MistralService = require('./services/mistral');

// Import configurations
const logger = require('./config/logger');
const corsOptions = require('./config/cors');
const { generalLimiter, strictLimiter } = require('./config/rateLimiter');
const { validateGenerateRequest, validateRepurposeRequest } = require('./middleware/validator');

const app = express();
const PORT = process.env.API_PORT || 3002;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ===========================================
// Middleware Configuration
// ===========================================

// Apply general rate limiting to all requests
app.use(generalLimiter);

// CORS with whitelist
app.use(cors(corsOptions));

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path} - IP: ${req.ip}`);
  next();
});

// ===========================================
// Routes
// ===========================================

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
  const isConfigured = !!MISTRAL_API_KEY && MISTRAL_API_KEY !== 'your_mistral_api_key_here';

  res.status(200).json({
    status: 'OK',
    service: 'ReContent API',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    mistral_configured: isConfigured,
  });
});

/**
 * Generate content for multiple platforms
 * POST /generate
 */
app.post('/generate', strictLimiter, validateGenerateRequest, async (req, res) => {
  try {
    const { content, platforms, profile } = req.body;

    // Check API key configuration
    if (!MISTRAL_API_KEY || MISTRAL_API_KEY === 'your_mistral_api_key_here') {
      logger.error('[GENERATE] Mistral API key not configured');
      return res.status(500).json({
        error: 'Service configuration error',
        message: 'Mistral API key not configured. Please contact administrator.',
      });
    }

    logger.info(`[GENERATE] Processing ${platforms.length} platforms - Content length: ${content.length} chars`);

    const results = {};
    const userProfile = profile || { name: '', bio: '', tone: 'professional' };

    // Descriptions des tons
    const TONE_DESCRIPTIONS = {
      casual: 'décontracté et friendly, utilise un langage accessible',
      professional: 'professionnel et formel, maintiens un ton sérieux',
      technical: 'technique et précis, utilise un vocabulaire expert',
    };

    // Construire les infos utilisateur
    const authorInfo = userProfile.name ? `Tu es ${userProfile.name}. ` : 'Tu es un développeur. ';
    const bioInfo = userProfile.bio ? `${userProfile.bio}\n` : '';
    const toneInfo = `Ton : ${TONE_DESCRIPTIONS[userProfile.tone] || TONE_DESCRIPTIONS.professional}.\n`;

    // Fonction helper pour appeler Mistral
    const callMistral = async (prompt, maxTokens = 1200) => {
      const response = await axios.post(
        MISTRAL_API_URL,
        {
          model: 'mistral-small-latest',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: maxTokens,
        },
        {
          headers: {
            Authorization: `Bearer ${MISTRAL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );
      return response.data.choices[0].message.content;
    };

    // Traiter chaque plateforme
    for (const platform of platforms) {
      try {
        let prompt = '';
        let maxTokens = 1200;

        switch (platform) {
          case 'twitter':
            prompt = `${authorInfo}${bioInfo}${toneInfo}

MISSION : Transforme ce contenu en thread X (Twitter) optimisé et engageant.

CONTENU SOURCE :
${content}

INSTRUCTIONS PRÉCISES :
1. Crée un thread de 8 à 12 tweets maximum
2. Chaque tweet doit être numéroté (format : "1/", "2/", etc.)
3. Chaque tweet doit faire MAXIMUM 280 caractères (espaces inclus)
4. Le premier tweet doit être une accroche percutante
5. Le dernier tweet doit contenir un call-to-action
6. Utilise des émojis stratégiques (1-2 par tweet max)
7. Ajoute des sauts de ligne pour l'aération si pertinent

FORMAT DE SORTIE :
Retourne UNIQUEMENT le thread, un tweet par ligne, sans texte additionnel.`;
            break;

          case 'linkedin':
            prompt = `${authorInfo}${bioInfo}${toneInfo}

MISSION : Transforme ce contenu en post LinkedIn professionnel et engageant.

CONTENU SOURCE :
${content}

INSTRUCTIONS PRÉCISES :
1. Maximum 1300 caractères (limite LinkedIn pour visibilité optimale)
2. Structure avec accroche + 3-5 points clés + conclusion + CTA + hashtags
3. Utilise des émojis stratégiques (3-5 max)
4. Utilise le markdown : **gras** pour les mots clés
5. Aère le texte avec des sauts de ligne

FORMAT DE SORTIE :
Retourne directement le post formaté, prêt à publier.`;
            break;

          case 'devto':
            prompt = `${authorInfo}${bioInfo}${toneInfo}

MISSION : Transforme ce contenu en article Dev.to technique et bien structuré.

CONTENU SOURCE :
${content}

INSTRUCTIONS PRÉCISES :
1. Longueur cible : 500-800 mots
2. Structure Markdown : # Titre, ## Sections, code blocks, listes
3. Utilise émojis dans titres, **gras**, *italique*
4. Inclus tips avec > 💡 **Tip:**
5. Tags à la fin

FORMAT DE SORTIE :
Retourne l'article complet en Markdown.`;
            maxTokens = 2500;
            break;

          case 'github':
            prompt = `${authorInfo}${bioInfo}${toneInfo}

MISSION : Transforme ce contenu en README.md GitHub professionnel.

CONTENU SOURCE :
${content}

INSTRUCTIONS PRÉCISES :
1. Structure : Titre, badges, description, features, installation, usage, documentation, license
2. Émojis dans titres, code blocks bash, exemples concrets
3. Quick start oriented

FORMAT DE SORTIE :
README.md complet.`;
            maxTokens = 2000;
            break;

          case 'newsletter':
            prompt = `${authorInfo}${bioInfo}${toneInfo}

MISSION : Transforme ce contenu en email de newsletter engageant.

CONTENU SOURCE :
${content}

INSTRUCTIONS PRÉCISES :
1. Longueur : 300-500 mots
2. Structure : Objet, preview, salutation, intro, corps (2-3 sections), CTA, signature, P.S.
3. Ton conversationnel, markdown simple, CTA clair
4. Paragraphes courts (lisibilité mobile)

FORMAT DE SORTIE :
Email complet formaté en Markdown.`;
            maxTokens = 1500;
            break;

          default:
            logger.warn(`[GENERATE] Unknown platform: ${platform}`);
            results[platform] = { error: `Platform '${platform}' not supported` };
            continue;
        }

        logger.debug(`[GENERATE] Calling Mistral for platform: ${platform}`);
        results[platform] = await callMistral(prompt, maxTokens);
      } catch (platformError) {
        logger.error(`[ERROR] Platform ${platform}: ${platformError.message}`);
        results[platform] = {
          error: `Failed to generate for ${platform}`,
          details: platformError.message,
        };
      }
    }

    // Réponse réussie
    logger.info(`[GENERATE] Successfully processed ${platforms.length} platforms`);
    res.status(200).json({
      success: true,
      results: results,
      platforms_processed: platforms.length,
    });
  } catch (error) {
    logger.error(`[ERROR] /generate: ${error.message}`);

    if (error.response) {
      // Erreur Mistral API
      res.status(error.response.status).json({
        error: 'Mistral API error',
        details: error.response.data,
      });
    } else if (error.code === 'ECONNABORTED') {
      // Timeout
      res.status(504).json({
        error: 'Request timeout',
        message: 'Mistral API took too long to respond',
      });
    } else {
      // Erreur générique
      res.status(500).json({
        error: 'Internal server error',
        message: 'An unexpected error occurred',
      });
    }
  }
});

/**
 * Legacy endpoint for compatibility
 * POST /repurpose
 */
app.post('/repurpose', strictLimiter, validateRepurposeRequest, async (req, res) => {
  try {
    const { content, targetFormat } = req.body;

    if (!MISTRAL_API_KEY || MISTRAL_API_KEY === 'your_mistral_api_key_here') {
      logger.error('[REPURPOSE] Mistral API key not configured');
      return res.status(500).json({
        error: 'Service configuration error',
        message: 'Mistral API key not configured',
      });
    }

    logger.info(`[REPURPOSE] Processing content for format: ${targetFormat}`);

    const response = await axios.post(
      MISTRAL_API_URL,
      {
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: `Tu es un expert en repurposing de contenu. Transforme le contenu fourni au format demandé : ${targetFormat}`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${MISTRAL_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    res.status(200).json({
      success: true,
      result: response.data.choices[0].message.content,
      usage: response.data.usage,
    });
  } catch (error) {
    logger.error(`[ERROR] /repurpose: ${error.message}`);
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred',
    });
  }
});

// ===========================================
// Error Handlers
// ===========================================

// 404 handler
app.use((req, res) => {
  logger.warn(`[404] Route not found: ${req.method} ${req.path} - IP: ${req.ip}`);
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    available_routes: ['/health', '/generate', '/repurpose'],
  });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`[ERROR] ${err.message}`);

  // CORS errors
  if (err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'CORS policy violation',
      message: 'Origin not allowed',
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal server error',
    message: NODE_ENV === 'production' ? 'An error occurred' : err.message,
  });
});

// ===========================================
// Server Startup
// ===========================================

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`✅ ReContent API v1.0.0 listening on port ${PORT}`);
  logger.info(`🌍 Environment: ${NODE_ENV}`);
  logger.info(
    `🔑 Mistral API: ${MISTRAL_API_KEY && MISTRAL_API_KEY !== 'your_mistral_api_key_here' ? 'Configured ✅' : 'NOT configured ❌'}`
  );
  logger.info(`🔒 CORS: Whitelist enabled`);
  logger.info(`🛡️  Rate limiting: Active`);
  logger.info(`📝 Validation: Strict mode`);
  logger.info(`🌐 Health check: http://localhost:${PORT}/health`);
  logger.info(`📊 Generate endpoint: POST http://localhost:${PORT}/generate`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});
