const express = require("express");

const router = express.Router();

// Health check for API v1
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "API v1 is running",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
