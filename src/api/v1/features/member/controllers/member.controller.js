const memberService = require("../services/member.service");
const { getAuth } = require("@clerk/express");

/**
 * Member Controller
 * Handles HTTP requests and responses for member operations
 * Basic CRUD operations only
 */

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

  _getOrgId(req) {
    const auth = getAuth(req);
    return auth.orgId || auth.sessionClaims?.org_id;
  }
  /**
   * Create a new member in the organization
   * POST /api/v1/members
   */
  async createMember(req, res, next) {
    try {
      const auth = getAuth(req);
      const orgId = this._getOrgId(req);

      // Ensure organization exists (auto-create from Clerk data if needed)
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();

      const existingOrg = await prisma.organization.findUnique({
        where: { id: orgId },
      });

      if (!existingOrg) {
        await prisma.organization.create({
          data: {
            id: orgId,
            name: auth.orgSlug || `Organization ${orgId}`,
            ownerUserId: auth.userId,
          },
        });
      }

      await prisma.$disconnect();

      const memberData = {
        orgId,
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
      };

      const member = await memberService.createMember(memberData);

      res.status(201).json({
        success: true,
        message: "Member created successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all members in an organization
   * GET /api/v1/members?org_id=xxx&page=1&limit=10&includeInactive=true
   */
  async getAllMembers(req, res, next) {
    try {
      const organizationId = this._getOrgId(req);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const includeInactive = req.query.includeInactive !== "false"; // Default to true

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

  /**
   * Get member by ID
   * GET /api/v1/members/:id
   */
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

  /**
   * Update member
   * PATCH /api/v1/members/:id
   */
  async updateMember(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = {};

      // Map all possible update fields
      if (req.body.firstName !== undefined)
        updateData.firstName = req.body.firstName;
      if (req.body.lastName !== undefined)
        updateData.lastName = req.body.lastName;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.dateOfBirth !== undefined)
        updateData.dateOfBirth = req.body.dateOfBirth;
      if (req.body.gender !== undefined) updateData.gender = req.body.gender;
      if (req.body.joinDate !== undefined)
        updateData.joinDate = req.body.joinDate;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.isActive !== undefined)
        updateData.isActive = req.body.isActive;

      const member = await memberService.updateMember(id, updateData);

      res.status(200).json({
        success: true,
        message: "Member updated successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete member (soft delete)
   * DELETE /api/v1/members/:id
   */
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

  /**
   * Search members within an organization
   * GET /api/v1/members/search?org_id=xxx&q=searchTerm&includeInactive=true
   */
  async searchMembers(req, res, next) {
    try {
      const organizationId = this._getOrgId(req);
      const searchTerm = req.query.q;
      const limit = parseInt(req.query.limit) || 10;
      const includeInactive = req.query.includeInactive !== "false"; // Default to true

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: "Search term is required",
        });
      }

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

  /**
   * Get member statistics for an organization
   * GET /api/v1/members/stats?org_id=xxx
   */
  async getMemberStats(req, res, next) {
    try {
      const organizationId = this._getOrgId(req);

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

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
