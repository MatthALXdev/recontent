// ===========================================
// Input Validation Middleware
// ===========================================
// Strict validation to prevent injection and abuse

const logger = require('../config/logger');

// Whitelist of allowed platforms
const ALLOWED_PLATFORMS = ['twitter', 'linkedin', 'devto', 'github', 'newsletter'];

// Whitelist of allowed tones
const ALLOWED_TONES = ['casual', 'professional', 'technical'];

// Content validation constants
const MIN_CONTENT_LENGTH = 100;
const MAX_CONTENT_LENGTH = 10000;
const MAX_NAME_LENGTH = 100;
const MAX_BIO_LENGTH = 500;

/**
 * Validate generate endpoint request
 */
function validateGenerateRequest(req, res, next) {
  const { content, platforms, profile } = req.body;

  // Validate content
  if (!content || typeof content !== 'string') {
    logger.warn(`[VALIDATION] Missing or invalid content field from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: 'Content is required and must be a string',
    });
  }

  // Check content length
  if (content.length < MIN_CONTENT_LENGTH) {
    logger.warn(`[VALIDATION] Content too short (${content.length} chars) from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: `Content must be at least ${MIN_CONTENT_LENGTH} characters long`,
    });
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    logger.warn(`[VALIDATION] Content too long (${content.length} chars) from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: `Content must not exceed ${MAX_CONTENT_LENGTH} characters`,
    });
  }

  // Validate platforms
  if (!platforms || !Array.isArray(platforms) || platforms.length === 0) {
    logger.warn(`[VALIDATION] Missing or invalid platforms field from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: 'Platforms is required and must be a non-empty array',
    });
  }

  // Check maximum number of platforms (prevent abuse)
  if (platforms.length > ALLOWED_PLATFORMS.length) {
    logger.warn(`[VALIDATION] Too many platforms (${platforms.length}) from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: `Maximum ${ALLOWED_PLATFORMS.length} platforms allowed per request`,
    });
  }

  // Validate each platform against whitelist
  const invalidPlatforms = platforms.filter(p => !ALLOWED_PLATFORMS.includes(p));
  if (invalidPlatforms.length > 0) {
    logger.warn(`[VALIDATION] Invalid platforms: ${invalidPlatforms.join(', ')} from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: `Invalid platforms: ${invalidPlatforms.join(', ')}`,
      allowed: ALLOWED_PLATFORMS,
    });
  }

  // Validate profile (optional)
  if (profile) {
    if (typeof profile !== 'object' || Array.isArray(profile)) {
      logger.warn(`[VALIDATION] Invalid profile format from IP: ${req.ip}`);
      return res.status(400).json({
        error: 'Validation failed',
        details: 'Profile must be an object',
      });
    }

    // Validate name
    if (profile.name && typeof profile.name !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'Profile name must be a string',
      });
    }

    if (profile.name && profile.name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({
        error: 'Validation failed',
        details: `Profile name must not exceed ${MAX_NAME_LENGTH} characters`,
      });
    }

    // Validate bio
    if (profile.bio && typeof profile.bio !== 'string') {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'Profile bio must be a string',
      });
    }

    if (profile.bio && profile.bio.length > MAX_BIO_LENGTH) {
      return res.status(400).json({
        error: 'Validation failed',
        details: `Profile bio must not exceed ${MAX_BIO_LENGTH} characters`,
      });
    }

    // Validate tone
    if (profile.tone && !ALLOWED_TONES.includes(profile.tone)) {
      return res.status(400).json({
        error: 'Validation failed',
        details: `Invalid tone. Allowed values: ${ALLOWED_TONES.join(', ')}`,
      });
    }
  }

  // If all validations pass, continue
  next();
}

/**
 * Validate repurpose endpoint request (legacy)
 */
function validateRepurposeRequest(req, res, next) {
  const { content, targetFormat } = req.body;

  if (!content || typeof content !== 'string') {
    logger.warn(`[VALIDATION] Missing or invalid content in /repurpose from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: 'Content is required and must be a string',
    });
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return res.status(400).json({
      error: 'Validation failed',
      details: `Content must not exceed ${MAX_CONTENT_LENGTH} characters`,
    });
  }

  if (!targetFormat || typeof targetFormat !== 'string') {
    logger.warn(`[VALIDATION] Missing or invalid targetFormat in /repurpose from IP: ${req.ip}`);
    return res.status(400).json({
      error: 'Validation failed',
      details: 'targetFormat is required and must be a string',
    });
  }

  next();
}

module.exports = {
  validateGenerateRequest,
  validateRepurposeRequest,
};
