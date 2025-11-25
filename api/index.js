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

// Import configurations
const logger = require('./config/logger');
const corsOptions = require('./config/cors');
const { generalLimiter, strictLimiter } = require('./config/rateLimiter');
const { validateGenerateRequest, validateRepurposeRequest } = require('./middleware/validator');

// Import Mistral service
const MistralService = require('./services/mistral');

const app = express();
const PORT = process.env.API_PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize Mistral service (can be replaced for tests)
let mistralService = new MistralService({ apiKey: process.env.MISTRAL_API_KEY });

// Method to inject Mistral service (for testing)
app.setMistralService = (service) => {
  mistralService = service;
};

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
  res.status(200).json({
    status: 'OK',
    service: 'ReContent API',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    mistral_configured: mistralService.isConfigured(),
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
    if (!mistralService.isConfigured()) {
      logger.error('[GENERATE] Mistral API key not configured');
      return res.status(500).json({
        error: 'Service configuration error',
        message: 'Mistral API key not configured. Please contact administrator.',
      });
    }

    logger.info(`[GENERATE] Processing ${platforms.length} platforms - Content length: ${content.length} chars`);

    // Use MistralService to generate content for all platforms
    const results = await mistralService.generateForPlatforms(platforms, content, profile);

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

    // Check API key configuration
    if (!mistralService.isConfigured()) {
      logger.error('[REPURPOSE] Mistral API key not configured');
      return res.status(500).json({
        error: 'Service configuration error',
        message: 'Mistral API key not configured',
      });
    }

    logger.info(`[REPURPOSE] Processing content for format: ${targetFormat}`);

    // Use MistralService instead of direct axios call
    const systemPrompt = `Tu es un expert en repurposing de contenu. Transforme le contenu fourni au format demandé : ${targetFormat}`;
    const result = await mistralService.callWithSystem(systemPrompt, content);

    res.status(200).json({
      success: true,
      result: result.content,
      usage: result.usage,
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
// Server Startup (only if run directly)
// ===========================================

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`✅ ReContent API v1.0.0 listening on port ${PORT}`);
    logger.info(`🌍 Environment: ${NODE_ENV}`);
    logger.info(
      `🔑 Mistral API: ${mistralService.isConfigured() ? 'Configured ✅' : 'NOT configured ❌'}`
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
}

// Export for testing
module.exports = app;
