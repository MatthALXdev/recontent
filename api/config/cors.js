// ===========================================
// CORS Configuration
// ===========================================
// Secure CORS configuration with environment-based whitelisting

const isProduction = process.env.NODE_ENV === 'production';

// Define allowed origins based on environment
const allowedOrigins = isProduction
  ? [
      'https://recontent.devamalix.fr',
      'https://www.recontent.devamalix.fr',
    ]
  : [
      'http://localhost:8090',
      'http://localhost:5173',
      'http://127.0.0.1:8090',
      'http://127.0.0.1:5173',
      'http://recontent.nexus.local',
    ];

// CORS options
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, Postman, curl)
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Pass false instead of Error to properly reject the origin
      // This prevents CORS headers from being sent (correct behavior)
      callback(null, false);
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
};

module.exports = corsOptions;
