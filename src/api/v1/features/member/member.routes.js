const express = require("express");
const memberController = require("./controllers/member.controller");

const router = express.Router();

/**
 * Member Routes
 * Base path: /api/v1/members
 * Simple CRUD operations for members
 */

// Search members (must come before /:id to avoid conflicts)
router.get("/search", memberController.searchMembers);

// Get member statistics
router.get("/stats", memberController.getMemberStats);

// Get all members in an organization
router.get("/", memberController.getAllMembers);

// Get member by ID
router.get("/:id", memberController.getMemberById);

// Create new member
router.post("/", memberController.createMember);

// Update member
router.patch("/:id", memberController.updateMember);

// Delete member (soft delete)
router.delete("/:id", memberController.deleteMember);

module.exports = router;
