const memberService = require("../services/member.service");
const { getAuth } = require("@clerk/express");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class MemberController {
  constructor() {
    this.createMember = this.createMember.bind(this);
    this.getAllMembers = this.getAllMembers.bind(this);
    this.getMemberById = this.getMemberById.bind(this);
    this.updateMember = this.updateMember.bind(this);
    this.deleteMember = this.deleteMember.bind(this);
    this.searchMembers = this.searchMembers.bind(this);
    this.getMemberStats = this.getMemberStats.bind(this);
  }

  async createMember(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const auth = getAuth(req);

      const member = await memberService.createMember({
        orgId,
        orgSlug: auth.orgSlug,
        ownerUserId: auth.userId,
        clerkUserId: req.body.clerkUserId || null,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phone: req.body.phone,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        joinDate: req.body.joinDate || new Date(),
        notes: req.body.notes || null,
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      });

      res.status(201).json({
        success: true,
        message: "Member created successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllMembers(req, res, next) {
    try {
      const organizationId = requireOrgId(req, res);
      if (!organizationId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const includeInactive = req.query.includeInactive !== "false";

      const result = await memberService.getAllMembers(
        organizationId,
        page,
        limit,
        includeInactive,
      );

      res.status(200).json({
        success: true,
        data: result.members,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMemberById(req, res, next) {
    try {
      const { id } = req.params;
      const member = await memberService.getMemberById(id);

      res.status(200).json({
        success: true,
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMember(req, res, next) {
    try {
      const { id } = req.params;
      const member = await memberService.updateMember(id, req.body);

      res.status(200).json({
        success: true,
        message: "Member updated successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteMember(req, res, next) {
    try {
      const { id } = req.params;
      await memberService.deleteMember(id);

      res.status(200).json({
        success: true,
        message: "Member deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  async searchMembers(req, res, next) {
    try {
      const organizationId = requireOrgId(req, res);
      if (!organizationId) return;

      const searchTerm = req.query.q;
      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

      const limit = parseInt(req.query.limit) || 10;
      const includeInactive = req.query.includeInactive !== "false";

      const members = await memberService.searchMembers(
        organizationId,
        searchTerm,
        limit,
        includeInactive,
      );

      res.status(200).json({
        success: true,
        data: members,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMemberStats(req, res, next) {
    try {
      const organizationId = requireOrgId(req, res);
      if (!organizationId) return;

      const stats = await memberService.getMemberStats(organizationId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MemberController();
