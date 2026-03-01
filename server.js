const express = require("express");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");
const config = require("./src/config/env.config");
const { testPrismaConnection } = require("./src/config/prisma.config");
const apiRoutes = require("./src/api");
const { errorHandler, notFoundHandler } = require("./src/shared/middlewares");
const { startScheduler } = require("./src/scheduler");

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

const startServer = async () => {
  try {
    const postgresConnected = await testPrismaConnection();

    if (!postgresConnected && config.isProduction()) {
      throw new Error("Database connection failed");
    }

    startScheduler();

    const server = app.listen(config.server.port, () => {
      console.log(`\n🚀 Server running on port ${config.server.port}`);
      console.log(`📦 Environment: ${config.server.env}`);
      console.log(`🐘 PostgreSQL: ${postgresConnected ? "✓" : "✗"}\n`);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
      console.log(`\n${signal} received. Closing server gracefully...`);

      server.close(() => {
        console.log("Server closed");
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
