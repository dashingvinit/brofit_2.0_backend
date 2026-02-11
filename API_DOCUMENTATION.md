# Brofit 2.0 Backend API Documentation

## Base URL
```
http://localhost:3000/api/v1
```

## Authentication
All endpoints (except webhooks) require authentication via Clerk. Include the Clerk JWT token in the Authorization header:
```
Authorization: Bearer <clerk_jwt_token>
```

Most endpoints also require organization context, which is automatically extracted from the Clerk token.

---

## 🔐 User Management APIs

### 1. Register/Create User (Manual Registration)
**Endpoint:** `POST /users`
**Access:** Admin only
**Description:** Manually create a gym member without Clerk authentication

**Request Body:**
```json
{
  "email": "member@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+1234567890",
  "role": "member",
  "imageUrl": "https://example.com/image.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "user_id_here",
    "email": "member@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "member",
    "imageUrl": "https://example.com/image.jpg",
    "clerkOrganizationId": "org_id",
    "isActive": true,
    "membershipPlans": [],
    "trainingPlans": [],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Notes:**
- `clerkUserId` is optional and should be omitted for manual registrations
- Email must be unique within the organization
- Default role is "member" if not specified

---

### 2. Get All Users
**Endpoint:** `GET /users?page=1&limit=10`
**Access:** Admin only
**Description:** Get paginated list of all active users in the organization

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_id",
      "email": "member@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+1234567890",
      "role": "member",
      "isActive": true,
      "membershipPlans": [...],
      "trainingPlans": [...]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

### 3. Get User by ID
**Endpoint:** `GET /users/:id`
**Access:** Admin or user themselves
**Description:** Get detailed information about a specific user

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user_id",
    "email": "member@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+1234567890",
    "role": "member",
    "isActive": true,
    "membershipPlans": [
      {
        "_id": "membership_plan_id",
        "planId": "plan_ref_id",
        "planName": "Gold Membership",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-12-31T23:59:59.999Z",
        "status": "active",
        "amountPaid": 999,
        "paymentReference": "PAY12345",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "trainingPlans": [
      {
        "_id": "training_plan_id",
        "planId": "training_ref_id",
        "planName": "Personal Training",
        "trainerId": "trainer_user_id",
        "trainerName": "Jane Smith",
        "startDate": "2024-01-01T00:00:00.000Z",
        "endDate": "2024-06-30T23:59:59.999Z",
        "status": "active",
        "sessionsPerWeek": 3,
        "notes": "Focus on strength training",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### 4. Update User
**Endpoint:** `PATCH /users/:id`
**Access:** Admin or user themselves
**Description:** Update user information and role

**Request Body (all fields optional):**
```json
{
  "email": "newemail@example.com",
  "firstName": "Jane",
  "lastName": "Smith",
  "phone": "+9876543210",
  "role": "trainer",
  "imageUrl": "https://example.com/new-image.jpg"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "User updated successfully",
  "data": {
    // Updated user object
  }
}
```

**Notes:**
- Use this endpoint to change roles (e.g., member → trainer)
- Email must remain unique within the organization

---

### 5. Delete User
**Endpoint:** `DELETE /users/:id`
**Access:** Admin only
**Description:** Soft delete a user (sets isActive to false)

**Response (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

## 💳 User Membership Management APIs

### 6. Add Membership Plan to User
**Endpoint:** `POST /users/:id/memberships`
**Access:** Admin only
**Description:** Assign a membership plan to a user

**Request Body:**
```json
{
  "planId": "membership_plan_id",
  "planName": "Gold Membership",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.999Z",
  "status": "active",
  "amountPaid": 999,
  "paymentReference": "PAY12345"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Membership plan added successfully",
  "data": {
    // Complete user object with updated membershipPlans array
  }
}
```

**Status Values:**
- `active`: Currently active membership
- `expired`: Past the end date
- `cancelled`: Manually cancelled

**Notes:**
- Only one active membership can exist at a time
- `planId` should reference an existing membership plan from the catalog
- `amountPaid` and `paymentReference` are optional

---

### 7. Update Membership Plan
**Endpoint:** `PATCH /users/:id/memberships/:membershipId`
**Access:** Admin only
**Description:** Update an existing membership plan in user's array

**Request Body (all fields optional):**
```json
{
  "startDate": "2024-02-01T00:00:00.000Z",
  "endDate": "2024-12-31T23:59:59.999Z",
  "status": "cancelled",
  "amountPaid": 1200,
  "paymentReference": "PAY67890"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Membership plan updated successfully",
  "data": {
    // Complete user object with updated membershipPlans array
  }
}
```

---

### 8. Remove Membership Plan
**Endpoint:** `DELETE /users/:id/memberships/:membershipId`
**Access:** Admin only
**Description:** Remove a membership plan from user's array

**Response (200):**
```json
{
  "success": true,
  "message": "Membership plan removed successfully",
  "data": {
    // Complete user object with updated membershipPlans array
  }
}
```

---

## 🏋️ User Training Plan Management APIs

### 9. Add Training Plan to User
**Endpoint:** `POST /users/:id/trainings`
**Access:** Admin only
**Description:** Assign a training plan to a user

**Request Body:**
```json
{
  "planId": "training_plan_id",
  "planName": "Personal Training",
  "trainerId": "trainer_user_id",
  "trainerName": "Jane Smith",
  "startDate": "2024-01-01T00:00:00.000Z",
  "endDate": "2024-06-30T23:59:59.999Z",
  "status": "active",
  "sessionsPerWeek": 3,
  "notes": "Focus on strength training"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Training plan added successfully",
  "data": {
    // Complete user object with updated trainingPlans array
  }
}
```

**Status Values:**
- `active`: Currently active training
- `completed`: Finished training program
- `cancelled`: Cancelled before completion

**Notes:**
- Multiple training plans can be active simultaneously
- `planId`, `trainerId`, `trainerName`, and `endDate` are optional
- `sessionsPerWeek` helps track training frequency

---

### 10. Update Training Plan
**Endpoint:** `PATCH /users/:id/trainings/:trainingId`
**Access:** Admin only
**Description:** Update an existing training plan in user's array

**Request Body (all fields optional):**
```json
{
  "trainerId": "new_trainer_id",
  "trainerName": "New Trainer",
  "startDate": "2024-02-01T00:00:00.000Z",
  "endDate": "2024-08-31T23:59:59.999Z",
  "status": "completed",
  "sessionsPerWeek": 4,
  "notes": "Increased intensity"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Training plan updated successfully",
  "data": {
    // Complete user object with updated trainingPlans array
  }
}
```

---

### 11. Remove Training Plan
**Endpoint:** `DELETE /users/:id/trainings/:trainingId`
**Access:** Admin only
**Description:** Remove a training plan from user's array

**Response (200):**
```json
{
  "success": true,
  "message": "Training plan removed successfully",
  "data": {
    // Complete user object with updated trainingPlans array
  }
}
```

---

## 📋 Plan Catalog APIs (Membership Plans)

### 12. Get Active Membership Plans
**Endpoint:** `GET /plans/memberships`
**Access:** All authenticated users
**Description:** Get all active membership plans available in the gym

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_id",
      "organizationId": "org_id",
      "name": "Gold Membership",
      "description": "Full access to all facilities",
      "durationDays": 365,
      "price": 999,
      "features": [
        "24/7 gym access",
        "Group classes included",
        "Free parking"
      ],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### 13. Get All Membership Plans (Including Inactive)
**Endpoint:** `GET /plans/memberships/all`
**Access:** Admin only
**Description:** Get all membership plans including inactive ones

**Response:** Same as above but includes inactive plans

---

### 14. Get Membership Plan by ID
**Endpoint:** `GET /plans/memberships/:id`
**Access:** All authenticated users
**Description:** Get details of a specific membership plan

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "plan_id",
    "organizationId": "org_id",
    "name": "Gold Membership",
    "description": "Full access to all facilities",
    "durationDays": 365,
    "price": 999,
    "features": ["..."],
    "isActive": true
  }
}
```

---

### 15. Create Membership Plan
**Endpoint:** `POST /plans/memberships`
**Access:** Admin only
**Description:** Create a new membership plan in the catalog

**Request Body:**
```json
{
  "name": "Platinum Membership",
  "description": "Premium access with personal trainer",
  "durationDays": 365,
  "price": 1499,
  "features": [
    "24/7 gym access",
    "Personal trainer included",
    "Nutrition consultation"
  ]
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Membership plan created successfully",
  "data": {
    // Created plan object
  }
}
```

**Notes:**
- Plan name must be unique within the organization
- `durationDays` specifies how long the membership lasts
- `features` is an array of strings describing what's included

---

### 16. Update Membership Plan
**Endpoint:** `PATCH /plans/memberships/:id`
**Access:** Admin only
**Description:** Update an existing membership plan in the catalog

**Request Body (all fields optional):**
```json
{
  "name": "Gold Plus Membership",
  "description": "Updated description",
  "durationDays": 365,
  "price": 1099,
  "features": ["Updated feature list"]
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Membership plan updated successfully",
  "data": {
    // Updated plan object
  }
}
```

---

### 17. Deactivate Membership Plan
**Endpoint:** `DELETE /plans/memberships/:id`
**Access:** Admin only
**Description:** Deactivate a membership plan (soft delete)

**Response (200):**
```json
{
  "success": true,
  "message": "Membership plan deactivated successfully",
  "data": {
    // Plan object with isActive: false
  }
}
```

**Notes:**
- This is a soft delete - plan data is preserved
- Existing user memberships referencing this plan remain unaffected
- Deactivated plans won't appear in the active plans list

---

## 🎯 Plan Catalog APIs (Training Plans)

### 18. Get Active Training Plans
**Endpoint:** `GET /plans/trainings?category=weight-training`
**Access:** All authenticated users
**Description:** Get all active training plans, optionally filtered by category

**Query Parameters:**
- `category` (optional): Filter by category (weight-training, cardio, yoga, crossfit, personal-training, group-class, other)

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": "plan_id",
      "organizationId": "org_id",
      "name": "Personal Training Package",
      "description": "One-on-one training sessions",
      "category": "personal-training",
      "durationDays": 90,
      "sessionsPerWeek": 3,
      "price": 599,
      "features": [
        "Customized workout plan",
        "Progress tracking",
        "Nutrition guidance"
      ],
      "requiresTrainer": true,
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

**Training Categories:**
- `weight-training`: Strength and resistance training
- `cardio`: Cardiovascular exercise programs
- `yoga`: Yoga and flexibility classes
- `crossfit`: CrossFit training
- `personal-training`: One-on-one training
- `group-class`: Group fitness classes
- `other`: Other training types

---

### 19. Get All Training Plans (Including Inactive)
**Endpoint:** `GET /plans/trainings/all`
**Access:** Admin only
**Description:** Get all training plans including inactive ones

**Response:** Same as above but includes inactive plans

---

### 20. Get Training Plan by ID
**Endpoint:** `GET /plans/trainings/:id`
**Access:** All authenticated users
**Description:** Get details of a specific training plan

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "plan_id",
    "name": "Personal Training Package",
    "description": "One-on-one training sessions",
    "category": "personal-training",
    "durationDays": 90,
    "sessionsPerWeek": 3,
    "price": 599,
    "features": ["..."],
    "requiresTrainer": true,
    "isActive": true
  }
}
```

---

### 21. Create Training Plan
**Endpoint:** `POST /plans/trainings`
**Access:** Admin only
**Description:** Create a new training plan in the catalog

**Request Body:**
```json
{
  "name": "Advanced Strength Program",
  "description": "12-week strength building program",
  "category": "weight-training",
  "durationDays": 84,
  "sessionsPerWeek": 4,
  "price": 799,
  "features": [
    "Progressive overload protocol",
    "Video demonstrations",
    "Weekly check-ins"
  ],
  "requiresTrainer": true
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Training plan created successfully",
  "data": {
    // Created plan object
  }
}
```

**Notes:**
- Plan name must be unique within the organization
- `requiresTrainer` indicates if a trainer must be assigned
- `sessionsPerWeek` helps estimate training commitment

---

### 22. Update Training Plan
**Endpoint:** `PATCH /plans/trainings/:id`
**Access:** Admin only
**Description:** Update an existing training plan in the catalog

**Request Body (all fields optional):**
```json
{
  "name": "Updated Plan Name",
  "description": "Updated description",
  "category": "crossfit",
  "durationDays": 60,
  "sessionsPerWeek": 5,
  "price": 899,
  "features": ["Updated features"],
  "requiresTrainer": false
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Training plan updated successfully",
  "data": {
    // Updated plan object
  }
}
```

---

### 23. Deactivate Training Plan
**Endpoint:** `DELETE /plans/trainings/:id`
**Access:** Admin only
**Description:** Deactivate a training plan (soft delete)

**Response (200):**
```json
{
  "success": true,
  "message": "Training plan deactivated successfully",
  "data": {
    // Plan object with isActive: false
  }
}
```

---

## 🪝 Webhook Endpoint

### 24. Clerk Webhook (Admin Registration)
**Endpoint:** `POST /users/webhook/clerk`
**Access:** Public (validated by Clerk webhook signature)
**Description:** Handles Clerk webhooks for admin user synchronization

**Webhook Events Handled:**
- `organizationMembership.created`: Creates user in database when added to organization
- `organizationMembership.updated`: Updates user data
- `organizationMembership.deleted`: Soft deletes user

**Notes:**
- This endpoint is for admin users who authenticate through Clerk
- Regular gym members should be created using the manual registration endpoint
- Configure this webhook URL in your Clerk dashboard

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request:**
```json
{
  "success": false,
  "message": "Validation error message"
}
```

**401 Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "message": "Organization context required"
}
```

**404 Not Found:**
```json
{
  "success": false,
  "message": "Resource not found"
}
```

**500 Internal Server Error:**
```json
{
  "success": false,
  "message": "Internal server error"
}
```

---

## Data Models

### User Object
```typescript
{
  id: string;
  clerkUserId?: string; // Only for Clerk-authenticated users
  clerkOrganizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "member" | "trainer" | "admin";
  imageUrl?: string;
  isActive: boolean;
  membershipPlans: MembershipPlanInstance[];
  trainingPlans: TrainingPlanInstance[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Membership Plan Instance (in User)
```typescript
{
  _id: string; // Instance ID in array
  planId: string; // Reference to plan catalog
  planName: string;
  startDate: Date;
  endDate: Date;
  status: "active" | "expired" | "cancelled";
  amountPaid?: number;
  paymentReference?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Training Plan Instance (in User)
```typescript
{
  _id: string; // Instance ID in array
  planId?: string; // Reference to plan catalog
  planName: string;
  trainerId?: string; // Reference to trainer user
  trainerName?: string;
  startDate: Date;
  endDate?: Date;
  status: "active" | "completed" | "cancelled";
  sessionsPerWeek?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Membership Plan (Catalog)
```typescript
{
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  durationDays: number;
  price: number;
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Training Plan (Catalog)
```typescript
{
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  category: "weight-training" | "cardio" | "yoga" | "crossfit" | "personal-training" | "group-class" | "other";
  durationDays?: number;
  sessionsPerWeek?: number;
  price: number;
  features: string[];
  requiresTrainer: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

---

## Common Frontend Workflows

### 1. Register a New Gym Member
```javascript
// Step 1: Create the user
const response = await fetch('/api/v1/users', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    email: 'newmember@gym.com',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567890',
    role: 'member'
  })
});

const { data: user } = await response.json();

// Step 2: (Optional) Assign a membership plan
const membershipResponse = await fetch(`/api/v1/users/${user.id}/memberships`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'selected_plan_id',
    planName: 'Gold Membership',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    amountPaid: 999,
    paymentReference: 'PAY12345'
  })
});
```

### 2. Change User Role (Member to Trainer)
```javascript
const response = await fetch(`/api/v1/users/${userId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    role: 'trainer'
  })
});
```

### 3. Assign Training with Trainer
```javascript
const response = await fetch(`/api/v1/users/${memberId}/trainings`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${clerkToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    planId: 'training_plan_id',
    planName: 'Personal Training',
    trainerId: 'trainer_user_id',
    trainerName: 'Jane Smith',
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
    sessionsPerWeek: 3
  })
});
```

### 4. Get All Available Plans for Selection
```javascript
// Get membership plans
const membershipPlans = await fetch('/api/v1/plans/memberships', {
  headers: { 'Authorization': `Bearer ${clerkToken}` }
}).then(r => r.json());

// Get training plans
const trainingPlans = await fetch('/api/v1/plans/trainings', {
  headers: { 'Authorization': `Bearer ${clerkToken}` }
}).then(r => r.json());
```

---

## Notes for Frontend Development

1. **Authentication**: All requests must include the Clerk JWT token in the Authorization header
2. **Organization Context**: The organization ID is automatically extracted from the Clerk token
3. **Role-Based Access**: Some endpoints are restricted to admins only - implement proper role checks in your UI
4. **Date Handling**: All dates should be in ISO 8601 format
5. **IDs**: When working with embedded arrays (membershipPlans, trainingPlans), use the `_id` field for updates/deletes
6. **Plan References**: When assigning plans to users, you can reference the plan catalog by `planId`
7. **Soft Deletes**: User and plan deletions are soft deletes (isActive = false), not permanent removals
8. **Pagination**: User listing supports pagination - implement infinite scroll or page navigation
9. **Error Handling**: Always check the `success` field in responses and handle error messages appropriately
10. **Status Management**: Keep track of membership/training statuses (active, expired, completed, cancelled) for proper UI state

---

## Testing Tips

Use tools like Postman or curl to test the APIs:

```bash
# Example: Create a user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Authorization: Bearer YOUR_CLERK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gym.com",
    "firstName": "Test",
    "lastName": "User",
    "role": "member"
  }'
```

---

## Support

For issues or questions about the API, please refer to the backend team or create an issue in the project repository.
