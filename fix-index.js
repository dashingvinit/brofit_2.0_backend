const mongoose = require('mongoose');
require('dotenv').config();

async function fixIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get the users collection
    const User = mongoose.connection.collection('users');

    // Drop the problematic index
    try {
      await User.dropIndex('clerkUserId_1_clerkOrganizationId_1');
      console.log('✅ Successfully dropped old index');
    } catch (error) {
      if (error.code === 27 || error.message.includes('index not found')) {
        console.log('ℹ️  Index already dropped or does not exist');
      } else {
        throw error;
      }
    }

    console.log('\n✅ Index fix complete!');
    console.log('👉 Now restart your application to create the new partial index');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

fixIndex();
