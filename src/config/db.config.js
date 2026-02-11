const mongoose = require('mongoose');
const config = require('./env.config');

/**
 * MongoDB connection using Mongoose
 * Provides connection management and helper methods
 */

/**
 * Connect to MongoDB database
 * @returns {Promise<boolean>} True if connection is successful
 */
const connectDatabase = async () => {
  try {
    // Mongoose 6+ handles connection options automatically
    await mongoose.connect(config.database.uri);

    console.log('✓ Database connected successfully to MongoDB');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error.message);
    return false;
  }
};

/**
 * Test database connection
 * @returns {Promise<boolean>} True if connection is successful
 */
const testConnection = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log('✓ Database connection is active');
      return true;
    }
    return await connectDatabase();
  } catch (error) {
    console.error('✗ Database connection test failed:', error.message);
    return false;
  }
};

/**
 * Close database connection
 */
const closeConnection = async () => {
  try {
    await mongoose.connection.close();
    console.log('Database connection closed');
  } catch (error) {
    console.error('Error closing database connection:', error.message);
  }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
  if (config.isDevelopment()) {
    console.log('Mongoose connected to MongoDB');
  }
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Handle process termination
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeConnection();
  process.exit(0);
});

module.exports = {
  connectDatabase,
  testConnection,
  closeConnection,
  mongoose,
};
