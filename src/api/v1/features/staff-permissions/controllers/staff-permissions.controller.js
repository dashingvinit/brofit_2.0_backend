const { requireOrgId, requireOrgAdmin } = require("../../../../../shared/helpers/auth.helper");
const service = require("../services/staff-permissions.service");

class StaffPermissionsController {
  // GET /staff-permissions — accessible by org:admin and org:staff
  get = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await service.get(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /staff-permissions — org:admin only
  update = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await service.update(orgId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // GET /staff-permissions/members — admin only
  getStaffMembers = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const data = await service.getStaffMembers(orgId);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };

  // PATCH /staff-permissions/:clerkUserId — admin only
  updateStaffMember = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;
      const { clerkUserId } = req.params;
      const data = await service.updateStaffMember(orgId, clerkUserId, req.body);
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new StaffPermissionsController();
