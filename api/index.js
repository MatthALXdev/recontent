require('dotenv').config();
const express = require('express');
const cors = require('cors');
const MistralService = require('./services/mistral');

const app = express();
const PORT = process.env.API_PORT || 3002;

// Instance du service Mistral (peut être remplacée pour les tests)
let mistralService = new MistralService();

// Fonction pour injecter un service Mistral (pour les tests)
app.setMistralService = (service) => {
    mistralService = service;
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Logs basiques
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Health check
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        service: 'ReContent API',
        timestamp: new Date().toISOString(),
        mistral_configured: mistralService.isConfigured()
    });
});

// Route principale : Generate content pour multiples plateformes
app.post('/generate', async (req, res) => {
    try {
        const { content, platforms, profile } = req.body;

        // Validation
        if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: {
                    content: 'string (le contenu source)',
                    platforms: 'array (ex: ["twitter", "linkedin"])',
                    profile: 'object (optionnel: { name, bio, tone })'
                }
            });
        }

        if (!mistralService.isConfigured()) {
            return res.status(500).json({
                error: 'Mistral API key not configured',
                hint: 'Set MISTRAL_API_KEY in .env file'
            });
        }

        console.log(`[GENERATE] Processing ${platforms.length} platforms for content length: ${content.length}`);

        const results = await mistralService.generateForPlatforms(platforms, content, profile);

        // Réponse réussie
        res.status(200).json({
            success: true,
            results: results,
            platforms_processed: platforms.length
        });

    } catch (error) {
        console.error('[ERROR] /generate:', error.message);

        if (error.response) {
            // Erreur Mistral API
            res.status(error.response.status).json({
                error: 'Mistral API error',
                details: error.response.data
            });
        } else if (error.code === 'ECONNABORTED') {
            // Timeout
            res.status(504).json({
                error: 'Request timeout',
                message: 'Mistral API took too long to respond'
            });
        } else {
            // Erreur générique
            res.status(500).json({
                error: 'Internal server error',
                message: error.message
            });
        }
    }
});

// Route legacy pour compatibility (repurpose simple)
app.post('/repurpose', async (req, res) => {
    try {
        const { content, targetFormat } = req.body;

        if (!content || !targetFormat) {
            return res.status(400).json({
                error: 'Missing required fields: content and targetFormat',
                hint: 'Use /generate endpoint for multi-platform generation'
            });
        }

        if (!mistralService.isConfigured()) {
            return res.status(500).json({
                error: 'Mistral API key not configured'
            });
        }

        const systemPrompt = `Tu es un expert en repurposing de contenu. Transforme le contenu fourni au format demandé : ${targetFormat}`;
        const result = await mistralService.callWithSystem(systemPrompt, content);

        res.status(200).json({
            success: true,
            result: result.content,
            usage: result.usage
        });

    } catch (error) {
        console.error('[ERROR] /repurpose:', error.message);
        res.status(500).json({
            error: 'Internal server error',
            message: error.message
        });
    }
});

// Route catch-all 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Route not found',
        path: req.path,
        available_routes: ['/health', '/generate', '/repurpose']
    });
});

// Export app pour les tests
module.exports = app;

// Démarrage serveur seulement si ce fichier est exécuté directement
if (require.main === module) {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ ReContent API listening on port ${PORT}`);
        console.log(`🔑 Mistral API: ${mistralService.isConfigured() ? 'Configured ✅' : 'NOT configured ❌'}`);
        console.log(`🌐 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 Generate endpoint: POST http://localhost:${PORT}/generate`);
    });
}
