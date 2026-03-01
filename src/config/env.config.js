require('dotenv').config();

/**
 * Validates that required environment variables are set
 * @param {string[]} requiredVars - Array of required environment variable names
 * @throws {Error} If any required variables are missing
 */
const validateEnvVariables = (requiredVars) => {
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
};

// Required environment variables
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'CLERK_SECRET_KEY',
];

// Validate required variables in production
if (process.env.NODE_ENV === 'production') {
  validateEnvVariables(requiredVars);
}

/**
 * Environment configuration object
 * Centralizes all environment variables with type conversion and defaults
 */
const config = {
  // Server configuration
  server: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 5000,
    apiVersion: process.env.API_VERSION || 'v1',
  },

  // Clerk authentication
  clerk: {
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
    secretKey: process.env.CLERK_SECRET_KEY,
  },

  // CORS configuration
  cors: {
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
    mobileClientUrl: process.env.MOBILE_CLIENT_URL || 'http://localhost:19006',
  },

  // Helper methods
  isDevelopment: () => config.server.env === 'development',
  isProduction: () => config.server.env === 'production',
  isTest: () => config.server.env === 'test',
};

module.exports = config;
