const { PrismaClient } = require('@prisma/client');

/**
 * Prisma Client for PostgreSQL (Neon)
 * Provides database access using Prisma ORM
 */

// PrismaClient is attached to the global object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global;

const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Test Prisma/PostgreSQL connection
 * @returns {Promise<boolean>} True if connection is successful
 */
const testPrismaConnection = async () => {
  try {
    await prisma.$connect();
    console.log('✓ Prisma connected successfully to Neon PostgreSQL');
    return true;
  } catch (error) {
    console.error('✗ Prisma connection failed:', error.message);
    return false;
  }
};

/**
 * Close Prisma connection
 */
const closePrismaConnection = async () => {
  try {
    await prisma.$disconnect();
    console.log('Prisma connection closed');
  } catch (error) {
    console.error('Error closing Prisma connection:', error.message);
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await closePrismaConnection();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePrismaConnection();
  process.exit(0);
});

module.exports = {
  prisma,
  testPrismaConnection,
  closePrismaConnection,
};
