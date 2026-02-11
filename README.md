# Brofit Gym Management API

Production-grade Express.js backend with Clerk authentication and PostgreSQL database.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Authentication**: Clerk
- **Database**: PostgreSQL
- **Environment Management**: dotenv

## Project Structure

```
backend/
├── src/
│   ├── api/
│   │   ├── index.js                    # API version manager
│   │   └── v1/
│   │       ├── index.js                # V1 routes aggregator
│   │       └── features/
│   │           └── user/
│   │               ├── controllers/
│   │               │   └── user.controller.js
│   │               ├── models/
│   │               │   └── user.model.js
│   │               ├── repositories/
│   │               │   └── user.repository.js
│   │               ├── services/
│   │               │   └── user.service.js
│   │               ├── user.middlewares.js
│   │               └── user.routes.js
│   ├── config/
│   │   ├── env.config.js               # Environment configuration
│   │   └── db.config.js                # Database connection pool
│   ├── middlewares/
│   │   ├── index.js                    # Middleware exports
│   │   ├── errorHandler.js             # Error handling
│   │   └── logger.js                   # Request logging
│   └── utils/
│       └── helpers.js                  # Utility functions
├── .env                                # Environment variables (gitignored)
├── .env.example                        # Environment template
├── .gitignore                          # Git ignore rules
├── server.js                           # Application entry point
├── package.json                        # Dependencies
└── README.md                           # Documentation
```

### Architecture

**Feature-Based Structure**: Each feature (user, classes, subscriptions, etc.) is self-contained with its own:
- **Controllers**: Handle HTTP requests/responses
- **Services**: Business logic layer
- **Repositories**: Database operations
- **Models**: Data schemas and SQL
- **Middlewares**: Feature-specific middleware
- **Routes**: API endpoints

This structure promotes:
- **Scalability**: Easy to add new features
- **Maintainability**: Clear separation of concerns
- **Testability**: Isolated components
- **Team Collaboration**: Parallel development

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and update with your credentials:

```bash
cp .env.example .env
```

Update the following variables in `.env`:

**Clerk Authentication:**
- `CLERK_PUBLISHABLE_KEY`: Get from [Clerk Dashboard](https://dashboard.clerk.com)
- `CLERK_SECRET_KEY`: Get from [Clerk Dashboard](https://dashboard.clerk.com)

**PostgreSQL Database:**
- `DB_HOST`: Database host (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: brofit_gym)
- `DB_USER`: Database user
- `DB_PASSWORD`: Database password

### 3. Set Up PostgreSQL Database

Create the database:

```sql
CREATE DATABASE brofit_gym;
```

Run the database setup script to create tables:

```bash
npm run db:setup
```

This will create all necessary tables and indexes.

### 4. Run the Server

Development mode:
```bash
npm start
```

The server will start at `http://localhost:5000`

## API Endpoints

### Base Routes

- `GET /` - API welcome message
- `GET /health` - Health check with database status
- `GET /api` - API versions and documentation

### User Routes (`/api/v1/users`)

**Public:**
- `POST /api/v1/users/webhook/clerk` - Clerk webhook handler

**Protected (requires authentication):**
- `GET /api/v1/users/me` - Get current authenticated user
- `GET /api/v1/users` - Get all users (admin only)
- `GET /api/v1/users/:id` - Get user by ID (admin or owner)
- `POST /api/v1/users` - Create new user
- `PATCH /api/v1/users/:id` - Update user (admin or owner)
- `DELETE /api/v1/users/:id` - Delete user (admin only)

### Adding New Features

To add a new feature (e.g., `classes`):

1. Create feature folder: `src/api/v1/features/classes/`
2. Add subfolders: `controllers/`, `models/`, `repositories/`, `services/`
3. Create files:
   - `classes.routes.js` - Define endpoints
   - `classes.middlewares.js` - Feature middleware
   - `controllers/classes.controller.js` - Request handlers
   - `services/classes.service.js` - Business logic
   - `repositories/classes.repository.js` - DB operations
   - `models/classes.model.js` - Data schema
4. Import routes in `src/api/v1/index.js`

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | development |
| `PORT` | Server port | Yes | 5000 |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | No | - |
| `CLERK_SECRET_KEY` | Clerk secret key | Yes | - |
| `DB_HOST` | PostgreSQL host | Yes | localhost |
| `DB_PORT` | PostgreSQL port | Yes | 5432 |
| `DB_NAME` | Database name | Yes | brofit_gym |
| `DB_USER` | Database user | Yes | postgres |
| `DB_PASSWORD` | Database password | Yes | - |
| `DB_SSL` | Enable SSL for DB | No | false |
| `CLIENT_URL` | Frontend URL | No | http://localhost:3000 |
| `MOBILE_CLIENT_URL` | Mobile app URL | No | http://localhost:19006 |

## Features

- Production-grade environment configuration
- Clerk authentication middleware
- PostgreSQL connection pooling
- CORS configuration for frontend/mobile
- Global error handling
- Health check endpoint with database status
- Request logging in development mode
- Graceful shutdown handling

## Database Connection

The application uses PostgreSQL connection pooling for optimal performance:

- **Pool Size**: Min 2, Max 10 connections
- **Idle Timeout**: 30 seconds
- **Connection Timeout**: 2 seconds
- **Automatic reconnection** on connection loss
- **Graceful shutdown** on process termination

## Development

The server includes:

- Automatic environment validation
- Database connection testing on startup
- Detailed error messages in development
- Query logging in development mode
- CORS enabled for local development

## Security

- Environment variables never committed to git
- Clerk middleware for authentication
- CORS configuration
- SQL injection prevention via parameterized queries
- Global error handler prevents information leakage
