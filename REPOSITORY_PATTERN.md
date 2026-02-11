# Repository Pattern Guide

This project uses a **Base Repository Pattern** similar to MongoDB/Mongoose but adapted for PostgreSQL.

## Structure

```
src/
├── shared/
│   └── repositories/
│       └── crud.repository.js          # Shared base class
└── api/v1/features/
    └── {feature}/
        └── repositories/
            └── {feature}.repository.js  # Extends CrudRepository
```

## How It Works

### Base CrudRepository

The `CrudRepository` class provides common database operations for all features:

```javascript
const CrudRepository = require('../../../../../shared/repositories/crud.repository');

class YourRepository extends CrudRepository {
  constructor() {
    super('your_table_name'); // Pass table name to base class
  }

  // Add custom methods here
}
```

### Available Base Methods

All repositories automatically inherit these methods:

| Method | Description | Example |
|--------|-------------|---------|
| `create(data)` | Insert new record | `await repo.create({ name: 'John' })` |
| `get(id)` | Find by ID | `await repo.get(userId)` |
| `getAll(options)` | Get all records | `await repo.getAll({ limit: 10 })` |
| `update(id, data)` | Update by ID | `await repo.update(id, { name: 'Jane' })` |
| `destroy(id)` | Soft delete (is_active=false) | `await repo.destroy(id)` |
| `hardDelete(id)` | Permanent deletion | `await repo.hardDelete(id)` |
| `find(filter, options)` | Find with filter | `await repo.find({ role: 'admin' })` |
| `findOne(filter)` | Find one with filter | `await repo.findOne({ email: 'a@b.com' })` |
| `findWithPagination(filter, options)` | Paginated results | `await repo.findWithPagination({}, { page: 1, limit: 10 })` |
| `count(filter)` | Count records | `await repo.count({ is_active: true })` |
| `exists(filter)` | Check if exists | `await repo.exists({ email: 'a@b.com' })` |
| `updateMany(filter, data)` | Update multiple | `await repo.updateMany({ role: 'user' }, { status: 'active' })` |
| `deleteMany(filter)` | Delete multiple | `await repo.deleteMany({ is_active: false })` |
| `insertMany(dataArray)` | Bulk insert | `await repo.insertMany([{...}, {...}])` |
| `rawQuery(sql, params)` | Execute raw SQL | `await repo.rawQuery('SELECT ...', [param])` |

## Creating a New Feature Repository

### Example: Classes Feature

1. **Create repository file:**
   ```javascript
   // src/api/v1/features/classes/repositories/classes.repository.js
   const CrudRepository = require('../../../../../shared/repositories/crud.repository');

   class ClassesRepository extends CrudRepository {
     constructor() {
       super('classes'); // Your table name
     }

     // Add custom methods
     async findByInstructor(instructorId) {
       return await this.find({ instructor_id: instructorId });
     }

     async findUpcomingClasses() {
       const query = `
         SELECT * FROM classes
         WHERE start_time > NOW()
         ORDER BY start_time ASC
       `;
       const result = await this.rawQuery(query);
       return result.rows;
     }
   }

   module.exports = new ClassesRepository();
   ```

2. **Use in service:**
   ```javascript
   const classesRepository = require('../repositories/classes.repository');

   // Use base methods
   const allClasses = await classesRepository.getAll({ limit: 20 });
   const classById = await classesRepository.get(classId);

   // Use custom methods
   const upcoming = await classesRepository.findUpcomingClasses();
   ```

## Data Transformation

### Important: Database Column Names vs API Field Names

PostgreSQL uses `snake_case` (e.g., `first_name`, `created_at`)
JavaScript/API uses `camelCase` (e.g., `firstName`, `createdAt`)

**When creating/updating, transform to DB column names:**

```javascript
// In Service Layer
async createUser(userData) {
  // Transform camelCase to snake_case
  const dbData = {
    clerk_user_id: userData.clerkUserId,
    first_name: userData.firstName,
    last_name: userData.lastName,
    email: userData.email,
  };

  const user = await userRepository.create(dbData);
  return user;
}
```

## UserRepository Example

```javascript
const CrudRepository = require('../../../../../repositories/crud-repository');

class UserRepository extends CrudRepository {
  constructor() {
    super('users');
  }

  // Custom method: Find by email
  async findByEmail(email) {
    return await this.findOne({ email });
  }

  // Custom method: Find by Clerk ID
  async findByClerkId(clerkUserId) {
    return await this.findOne({ clerk_user_id: clerkUserId });
  }

  // Custom method: Find active users with pagination
  async findActiveUsers(page = 1, limit = 10) {
    return await this.findWithPagination(
      { is_active: true },
      { page, limit, orderBy: 'created_at DESC' }
    );
  }

  // Custom method: Complex query with raw SQL
  async getUserStats() {
    const query = `
      SELECT
        role,
        COUNT(*) as count,
        SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active
      FROM users
      GROUP BY role
    `;
    const result = await this.rawQuery(query);
    return result.rows;
  }
}

module.exports = new UserRepository();
```

## Benefits

✅ **Code Reusability** - Write common operations once
✅ **Consistency** - All repositories follow same pattern
✅ **Less Boilerplate** - Only write feature-specific methods
✅ **Easy to Test** - Mock base class methods
✅ **Scalability** - Add features quickly
✅ **Familiar** - Same pattern as MongoDB/Mongoose

## When to Use Custom Methods

Use custom methods for:
- Complex queries with JOINs
- Business-specific filters
- Aggregations and statistics
- Search functionality
- Custom sorting/filtering logic

Use base methods for:
- Simple CRUD operations
- Basic filtering
- Standard pagination
- Existence checks
- Bulk operations
