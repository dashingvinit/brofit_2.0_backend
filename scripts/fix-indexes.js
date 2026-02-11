const mongoose = require('mongoose');
require('dotenv').config();

/**
 * Fix User model indexes
 * This script drops the old clerkUserId_1 index and ensures correct indexes exist
 */
async function fixUserIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✓ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get existing indexes
    const indexes = await usersCollection.indexes();
    console.log('\nCurrent indexes:');
    indexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key));
    });

    // Drop old indexes that need to be recreated with sparse option
    const oldIndexes = ['clerkUserId_1', 'email_1_clerkOrganizationId_1'];

    for (const oldIndexName of oldIndexes) {
      const hasOldIndex = indexes.some(idx => idx.name === oldIndexName);

      if (hasOldIndex) {
        const index = indexes.find(idx => idx.name === oldIndexName);
        // Check if it's missing the sparse option
        if (!index.sparse) {
          console.log(`\nDropping old index: ${oldIndexName} (missing sparse option)...`);
          await usersCollection.dropIndex(oldIndexName);
          console.log('✓ Old index dropped');
        } else {
          console.log(`\n✓ Index ${oldIndexName} is already correct (has sparse option)`);
        }
      } else {
        console.log(`\n✓ Index ${oldIndexName} not found (will be created with correct options)`);
      }
    }

    // Import the User model to ensure correct indexes are created
    const { User } = require('../src/api/v1/features/user/models/user.model');

    // Sync indexes - this will create missing indexes
    console.log('\nSyncing indexes from schema...');
    await User.syncIndexes();
    console.log('✓ Indexes synced');

    // Display final indexes
    const finalIndexes = await usersCollection.indexes();
    console.log('\nFinal indexes:');
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}:`, JSON.stringify(idx.key), idx.sparse ? '(sparse)' : '', idx.unique ? '(unique)' : '');
    });

    console.log('\n✅ Index fix completed successfully!');
  } catch (error) {
    console.error('❌ Error fixing indexes:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
}

// Run the fix
fixUserIndexes();
