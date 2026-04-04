const express = require("express");
const { requireSuperAdmin } = require("../../../../shared/helpers/auth.helper");
const platformController = require("./controllers/platform.controller");

const router = express.Router();

// All platform routes require super admin
router.use(requireSuperAdmin);

// Org management
router.get("/orgs", platformController.listOrgs);
router.post("/orgs", platformController.createOrg);
router.get("/orgs/:id", platformController.getOrg);
router.patch("/orgs/:id", platformController.updateOrg);
router.patch("/orgs/:id/status", platformController.setOrgStatus);
router.delete("/orgs/:id", platformController.deleteOrg);

// Org membership via Clerk
router.get("/orgs/:id/members", platformController.listOrgMembers);
router.post("/orgs/:id/invite", platformController.inviteToOrg);
router.get("/orgs/:id/invitations", platformController.listInvitations);

module.exports = router;
