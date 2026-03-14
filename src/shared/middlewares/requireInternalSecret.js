/**
 * Middleware to protect internal/cron-only endpoints.
 * Requires the caller to provide the CRON_SECRET via the
 * x-cron-secret header. Use this on any route that triggers
 * destructive or privileged batch operations (e.g. expire-subscriptions).
 */
function requireInternalSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    // Fail closed: if the secret isn't configured, block all access
    return res.status(503).json({
      success: false,
      message: "Internal endpoint not configured",
    });
  }

  const provided = req.headers["x-cron-secret"];
  if (!provided || provided !== secret) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
  }

  next();
}

module.exports = requireInternalSecret;
