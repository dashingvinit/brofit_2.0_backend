const config = require("../../config/env.config");

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode = 500, message } = err;

  // Handle specific error types
  if (err.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
  }

  if (err.name === "UnauthorizedError") {
    statusCode = 401;
    message = "Unauthorized";
  }

  // Database errors
  if (err.code === "23505") {
    // PostgreSQL unique violation
    statusCode = 409;
    message = "Resource already exists";
  }

  if (err.code === "23503") {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = "Invalid reference";
  }

  // Response object — always pass through client errors (4xx); hide internals for 5xx in production
  const isClientError = statusCode >= 400 && statusCode < 500;
  const response = {
    success: false,
    message: isClientError || config.isDevelopment() ? message : "Internal server error",
    ...(err.errors && err.errors.length > 0 && { errors: err.errors }),
    ...(config.isDevelopment() && { stack: err.stack }),
  };

  res.status(statusCode).json(response);
};

// 404 Not Found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
};
