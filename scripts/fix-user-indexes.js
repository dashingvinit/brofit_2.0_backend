/**
 * Script to fix User collection indexes
 * Removes the old non-sparse unique index on clerkUserId
 * Run with: node scripts/fix-user-indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/brofit_gym');
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('users');

    // List all indexes
    console.log('\nCurrent indexes:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`- ${index.name}:`, JSON.stringify(index.key), index.unique ? '(unique)' : '', index.sparse ? '(sparse)' : '');
    });

    // Check if the problematic index exists
    const hasOldIndex = indexes.some(idx => idx.name === 'clerkUserId_1');

    if (hasOldIndex) {
      console.log('\n❌ Found old clerkUserId_1 index - dropping it...');
      await collection.dropIndex('clerkUserId_1');
      console.log('✅ Successfully dropped clerkUserId_1 index');
    } else {
      console.log('\n✅ Old clerkUserId_1 index not found - no action needed');
    }

    // Verify final indexes
    console.log('\nFinal indexes:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`- ${index.name}:`, JSON.stringify(index.key), index.unique ? '(unique)' : '', index.sparse ? '(sparse)' : '');
    });

    console.log('\n✅ Index fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixIndexes();
