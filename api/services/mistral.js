/**
 * Service Mistral - Gère les appels à l'API Mistral
 * Avec injection de dépendances pour faciliter les tests
 */

const axios = require('axios');

const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

// Descriptions des tons
const TONE_DESCRIPTIONS = {
    casual: 'décontracté et friendly, utilise un langage accessible',
    professional: 'professionnel et formel, maintiens un ton sérieux',
    technical: 'technique et précis, utilise un vocabulaire expert'
};

class MistralService {
    /**
     * @param {Object} options
     * @param {string} options.apiKey - Clé API Mistral
     * @param {Object} options.httpClient - Client HTTP (axios par défaut, injectable pour tests)
     */
    constructor(options = {}) {
        // Utilise hasOwnProperty pour permettre de passer explicitement une string vide
        this.apiKey = options.hasOwnProperty('apiKey') ? options.apiKey : process.env.MISTRAL_API_KEY;
        this.httpClient = options.httpClient || axios;
        this.apiUrl = options.apiUrl || MISTRAL_API_URL;
    }

    /**
     * Vérifie si le service est configuré
     */
    isConfigured() {
        return !!this.apiKey && this.apiKey !== 'your_mistral_api_key_here';
    }

    /**
     * Appel générique à l'API Mistral
     */
    async call(prompt, maxTokens = 1200) {
        const response = await this.httpClient.post(this.apiUrl, {
            model: 'mistral-small-latest',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        return response.data.choices[0].message.content;
    }

    /**
     * Appel avec messages multiples (system + user)
     */
    async callWithSystem(systemPrompt, userContent, maxTokens = 1200) {
        const response = await this.httpClient.post(this.apiUrl, {
            model: 'mistral-small-latest',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            max_tokens: maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        return {
            content: response.data.choices[0].message.content,
            usage: response.data.usage
        };
    }

    /**
     * Construit les infos de profil pour les prompts
     */
    buildProfileInfo(profile = {}) {
        const userProfile = {
            name: profile.name || '',
            bio: profile.bio || '',
            tone: profile.tone || 'professional'
        };

        const authorInfo = userProfile.name ? `Tu es ${userProfile.name}. ` : 'Tu es un développeur. ';
        const bioInfo = userProfile.bio ? `${userProfile.bio}\n` : '';
        const toneInfo = `Ton : ${TONE_DESCRIPTIONS[userProfile.tone] || TONE_DESCRIPTIONS.professional}.\n`;

        return { authorInfo, bioInfo, toneInfo };
    }

    /**
     * Génère le prompt pour une plateforme donnée
     */
    buildPrompt(platform, content, profile = {}) {
        const { authorInfo, bioInfo, toneInfo } = this.buildProfileInfo(profile);

        const prompts = {
            twitter: {
                prompt: `${authorInfo}${bioInfo}${toneInfo}

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
Retourne UNIQUEMENT le thread, un tweet par ligne, sans texte additionnel.`,
                maxTokens: 1200
            },

            linkedin: {
                prompt: `${authorInfo}${bioInfo}${toneInfo}

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
Retourne directement le post formaté, prêt à publier.`,
                maxTokens: 1200
            },

            devto: {
                prompt: `${authorInfo}${bioInfo}${toneInfo}

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
Retourne l'article complet en Markdown.`,
                maxTokens: 2500
            },

            github: {
                prompt: `${authorInfo}${bioInfo}${toneInfo}

MISSION : Transforme ce contenu en README.md GitHub professionnel.

CONTENU SOURCE :
${content}

INSTRUCTIONS PRÉCISES :
1. Structure : Titre, badges, description, features, installation, usage, documentation, license
2. Émojis dans titres, code blocks bash, exemples concrets
3. Quick start oriented

FORMAT DE SORTIE :
README.md complet.`,
                maxTokens: 2000
            },

            newsletter: {
                prompt: `${authorInfo}${bioInfo}${toneInfo}

MISSION : Transforme ce contenu en email de newsletter engageant.

CONTENU SOURCE :
${content}

INSTRUCTIONS PRÉCISES :
1. Longueur : 300-500 mots
2. Structure : Objet, preview, salutation, intro, corps (2-3 sections), CTA, signature, P.S.
3. Ton conversationnel, markdown simple, CTA clair
4. Paragraphes courts (lisibilité mobile)

FORMAT DE SORTIE :
Email complet formaté en Markdown.`,
                maxTokens: 1500
            }
        };

        return prompts[platform] || null;
    }

    /**
     * Génère du contenu pour une plateforme
     */
    async generateForPlatform(platform, content, profile = {}) {
        const promptConfig = this.buildPrompt(platform, content, profile);

        if (!promptConfig) {
            throw new Error(`Platform '${platform}' not supported`);
        }

        return await this.call(promptConfig.prompt, promptConfig.maxTokens);
    }

    /**
     * Génère du contenu pour plusieurs plateformes
     */
    async generateForPlatforms(platforms, content, profile = {}) {
        const results = {};

        for (const platform of platforms) {
            try {
                console.log(`[MISTRAL] Generating for platform: ${platform}`);
                results[platform] = await this.generateForPlatform(platform, content, profile);
            } catch (error) {
                console.error(`[MISTRAL] Error for ${platform}:`, error.message);
                results[platform] = {
                    error: `Failed to generate for ${platform}`,
                    details: error.message
                };
            }
        }

        return results;
    }
}

module.exports = MistralService;
