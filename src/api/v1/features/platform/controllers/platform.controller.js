const { getAuth } = require("@clerk/express");
const platformService = require("../services/platform.service");

class PlatformController {
  listOrgs = async (req, res, next) => {
    try {
      const orgs = await platformService.listOrgs();
      res.json({ success: true, data: orgs });
    } catch (error) {
      next(error);
    }
  };

  getOrg = async (req, res, next) => {
    try {
      const org = await platformService.getOrg(req.params.id);
      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  };

  createOrg = async (req, res, next) => {
    try {
      const { name, ownerEmail } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: "name is required" });
      }

      const { userId } = getAuth(req);
      const org = await platformService.createOrg({ name, ownerEmail, creatorUserId: userId });

      res.status(201).json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  };

  updateOrg = async (req, res, next) => {
    try {
      const { name } = req.body;
      if (!name) {
        return res.status(400).json({ success: false, message: "name is required" });
      }

      const org = await platformService.updateOrg(req.params.id, { name });
      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  };

  setOrgStatus = async (req, res, next) => {
    try {
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return res.status(400).json({ success: false, message: "isActive (boolean) is required" });
      }
      const org = await platformService.setOrgStatus(req.params.id, isActive);
      res.json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  };

  deleteOrg = async (req, res, next) => {
    try {
      await platformService.deleteOrg(req.params.id);
      res.json({ success: true, message: "Organization deleted" });
    } catch (error) {
      next(error);
    }
  };

  inviteToOrg = async (req, res, next) => {
    try {
      const { emailAddress, role } = req.body;
      if (!emailAddress) {
        return res.status(400).json({ success: false, message: "emailAddress is required" });
      }

      const result = await platformService.inviteToOrg(req.params.id, { emailAddress, role });
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  listInvitations = async (req, res, next) => {
    try {
      const invitations = await platformService.listInvitations(req.params.id);
      res.json({ success: true, data: invitations });
    } catch (error) {
      next(error);
    }
  };

  listOrgMembers = async (req, res, next) => {
    try {
      const members = await platformService.listOrgMembers(req.params.id);
      res.json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new PlatformController();
