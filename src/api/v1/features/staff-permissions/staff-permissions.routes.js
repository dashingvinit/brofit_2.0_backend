const express = require("express");
const controller = require("./controllers/staff-permissions.controller");
const { requireOrgAdmin } = require("../../../../shared/helpers/auth.helper");

const router = express.Router();

// GET /staff-permissions — any org member (staff need to read org defaults)
router.get("/", controller.get);

// GET /staff-permissions/members — admin only, returns each staff member + their per-user overrides
// Must be registered before /:clerkUserId to avoid "members" being treated as a param
router.get("/members", requireOrgAdmin, controller.getStaffMembers);

// PATCH /staff-permissions — admin only, updates org-level defaults
router.patch("/", requireOrgAdmin, controller.update);

// PATCH /staff-permissions/:clerkUserId — admin only, sets per-user overrides via Clerk publicMetadata
router.patch("/:clerkUserId", requireOrgAdmin, controller.updateStaffMember);

module.exports = router;
