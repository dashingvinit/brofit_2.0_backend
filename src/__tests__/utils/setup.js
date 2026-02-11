/**
 * Test setup - runs before all tests
 * Sets up test environment variables and global configurations
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.CLERK_SECRET_KEY = 'test_clerk_secret_key';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'brofit_test';
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'postgres';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.MOBILE_CLIENT_URL = 'http://localhost:19006';

// Global test timeout
jest.setTimeout(10000);
