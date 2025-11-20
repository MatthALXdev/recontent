require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.API_PORT || 3002;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Augmenté pour les gros contenus

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
        mistral_configured: !!MISTRAL_API_KEY && MISTRAL_API_KEY !== 'your_mistral_api_key_here'
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

        if (!MISTRAL_API_KEY || MISTRAL_API_KEY === 'your_mistral_api_key_here') {
            return res.status(500).json({
                error: 'Mistral API key not configured',
                hint: 'Set MISTRAL_API_KEY in .env file'
            });
        }

        console.log(`[GENERATE] Processing ${platforms.length} platforms for content length: ${content.length}`);

        const results = {};
        const userProfile = profile || { name: '', bio: '', tone: 'professional' };

        // Descriptions des tons
        const TONE_DESCRIPTIONS = {
            casual: 'décontracté et friendly, utilise un langage accessible',
            professional: 'professionnel et formel, maintiens un ton sérieux',
            technical: 'technique et précis, utilise un vocabulaire expert'
        };

        // Construire les infos utilisateur
        const authorInfo = userProfile.name ? `Tu es ${userProfile.name}. ` : 'Tu es un développeur. ';
        const bioInfo = userProfile.bio ? `${userProfile.bio}\n` : '';
        const toneInfo = `Ton : ${TONE_DESCRIPTIONS[userProfile.tone] || TONE_DESCRIPTIONS.professional}.\n`;

        // Fonction helper pour appeler Mistral
        const callMistral = async (prompt, maxTokens = 1200) => {
            const response = await axios.post(MISTRAL_API_URL, {
                model: 'mistral-small-latest',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: maxTokens
            }, {
                headers: {
                    'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            });
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
                        console.warn(`[GENERATE] Unknown platform: ${platform}`);
                        results[platform] = { error: `Platform '${platform}' not supported` };
                        continue;
                }

                console.log(`[GENERATE] Calling Mistral for platform: ${platform}`);
                results[platform] = await callMistral(prompt, maxTokens);

            } catch (platformError) {
                console.error(`[ERROR] Platform ${platform}:`, platformError.message);
                results[platform] = {
                    error: `Failed to generate for ${platform}`,
                    details: platformError.message
                };
            }
        }

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

        if (!MISTRAL_API_KEY || MISTRAL_API_KEY === 'your_mistral_api_key_here') {
            return res.status(500).json({
                error: 'Mistral API key not configured'
            });
        }

        const response = await axios.post(MISTRAL_API_URL, {
            model: 'mistral-small-latest',
            messages: [
                {
                    role: 'system',
                    content: `Tu es un expert en repurposing de contenu. Transforme le contenu fourni au format demandé : ${targetFormat}`
                },
                {
                    role: 'user',
                    content: content
                }
            ]
        }, {
            headers: {
                'Authorization': `Bearer ${MISTRAL_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        res.status(200).json({
            success: true,
            result: response.data.choices[0].message.content,
            usage: response.data.usage
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
        console.log(`🔑 Mistral API: ${MISTRAL_API_KEY && MISTRAL_API_KEY !== 'your_mistral_api_key_here' ? 'Configured ✅' : 'NOT configured ❌'}`);
        console.log(`🌐 Health check: http://localhost:${PORT}/health`);
        console.log(`📝 Generate endpoint: POST http://localhost:${PORT}/generate`);
    });
}
