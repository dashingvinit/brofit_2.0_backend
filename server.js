const express = require("express");
const cors = require("cors");
const { clerkMiddleware } = require("@clerk/express");
const config = require("./src/config/env.config");
const db = require("./src/config/db.config");
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

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    const dbConnected = await db.connectDatabase();

    if (!dbConnected && config.isProduction()) {
      throw new Error("Database connection failed");
    }

    app.listen(config.server.port, () => {
      console.log(`Server running on port ${config.server.port}`);
      console.log(`Environment: ${config.server.env}`);
      console.log(`Database: ${dbConnected ? "Connected" : "Disconnected"}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
};

startServer();
