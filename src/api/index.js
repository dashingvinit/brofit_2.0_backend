const express = require("express");
const v1Routes = require("./v1");

const router = express.Router();

/**
 * API Routes
 * Manages versioning of the API
 */

// API version 1
router.use("/v1", v1Routes);

// Default route - show available versions
router.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Brofit Gym Management API",
    versions: {
      v1: "/api/v1",
    },
    documentation: "/api/v1/health",
  });
});

module.exports = router;
