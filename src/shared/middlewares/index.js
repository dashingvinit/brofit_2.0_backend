/**
 * Common Middlewares
 * Export all middleware functions from a single entry point
 */

const { errorHandler, notFoundHandler } = require('./errorHandler');

module.exports = {
  errorHandler,
  notFoundHandler,
};
