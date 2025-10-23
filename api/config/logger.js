// ===========================================
// Winston Logger Configuration
// ===========================================
const winston = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}`
  )
);

// Define which transports to use based on environment
const transports = [
  // Console output
  new winston.transports.Console(),
];

// In production, also log to files
if (isProduction) {
  transports.push(
    // Error logs
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Combined logs (warn and above)
    new winston.transports.File({
      filename: 'logs/combined.log',
      level: 'warn',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Create the logger
const logger = winston.createLogger({
  level: isProduction ? 'warn' : 'debug',
  levels,
  format,
  transports,
  exitOnError: false,
});

module.exports = logger;
