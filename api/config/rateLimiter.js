// ===========================================
// Rate Limiter Configuration
// ===========================================
// Protect API endpoints from abuse and DDoS attacks

const rateLimit = require('express-rate-limit');

// General rate limiter for all routes
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many requests from this IP',
    message: 'Please try again later',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.rateLimit.resetTime,
    });
  },
});

// Strict rate limiter for API generation endpoints
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many generation requests',
    message: 'You have exceeded the generation limit. Please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false, // Count all requests, even successful ones
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many content generation requests. Please wait before trying again.',
      retryAfter: Math.ceil((req.rateLimit.resetTime.getTime() - Date.now()) / 1000),
    });
  },
});

// Very strict limiter for failed authentication attempts
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 failed attempts per hour
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many failed attempts',
      message: 'Account temporarily locked. Please try again in 1 hour.',
    });
  },
});

module.exports = {
  generalLimiter,
  strictLimiter,
  authLimiter,
};
