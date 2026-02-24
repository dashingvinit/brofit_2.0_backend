const express = require("express");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");
const config = require("./src/config/env.config");
const db = require("./src/config/db.config");
const { testPrismaConnection } = require("./src/config/prisma.config");
const apiRoutes = require("./src/api");
const { errorHandler, notFoundHandler } = require("./src/shared/middlewares");

const app = express();

app.use(
  cors({
    origin: [config.cors.clientUrl, config.cors.mobileClientUrl],
    credentials: true,
  }),
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Clerk authentication middleware
app.use(clerkMiddleware());

// API routes
app.use("/api", apiRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

const initializeDatabases = async () => {
  const mongoConnected = await db.connectDatabase();
  const postgresConnected = await testPrismaConnection();

  if ((!mongoConnected || !postgresConnected) && config.isProduction()) {
    throw new Error("Database connection failed");
  }

  return { mongoConnected, postgresConnected };
};

const startServer = async () => {
  try {
    const { mongoConnected, postgresConnected } = await initializeDatabases();

    const server = app.listen(config.server.port, () => {
      console.log(`\n🚀 Server running on port ${config.server.port}`);
      console.log(`📦 Environment: ${config.server.env}`);
      console.log(`🗄️  MongoDB: ${mongoConnected ? "✓" : "✗"}`);
      console.log(`🐘 PostgreSQL: ${postgresConnected ? "✓" : "✗"}\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Closing server gracefully...`);

      server.close(async () => {
        console.log("Server closed");
        await db.closeConnection();
        process.exit(0);
      });

      // Force close after 10s
      setTimeout(() => {
        console.error("Forcing shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  } catch (error) {
    console.error("❌ Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
