const memberService = require("../services/member.service");

/**
 * Member Controller
 * Handles HTTP requests and responses for member operations
 * Basic CRUD operations only
 */

class MemberController {
  /**
   * Create a new member in the organization
   * POST /api/v1/members
   */
  async createMember(req, res, next) {
    try {
      const memberData = {
        org_id: req.body.org_id,
        clerk_user_id: req.body.clerk_user_id || null,
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        email: req.body.email,
        phone: req.body.phone,
        date_of_birth: req.body.date_of_birth,
        gender: req.body.gender,
        join_date: req.body.join_date || new Date(),
        notes: req.body.notes || null,
        is_active: req.body.is_active !== undefined ? req.body.is_active : true,
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
   * GET /api/v1/members?org_id=xxx&page=1&limit=10
   */
  async getAllMembers(req, res, next) {
    try {
      const organizationId = req.query.org_id;

      if (!organizationId) {
        return res.status(400).json({
          success: false,
          message: "Organization ID is required",
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await memberService.getAllMembers(organizationId, page, limit);

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
      if (req.body.first_name !== undefined) updateData.first_name = req.body.first_name;
      if (req.body.last_name !== undefined) updateData.last_name = req.body.last_name;
      if (req.body.email !== undefined) updateData.email = req.body.email;
      if (req.body.phone !== undefined) updateData.phone = req.body.phone;
      if (req.body.date_of_birth !== undefined) updateData.date_of_birth = req.body.date_of_birth;
      if (req.body.gender !== undefined) updateData.gender = req.body.gender;
      if (req.body.join_date !== undefined) updateData.join_date = req.body.join_date;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.is_active !== undefined) updateData.is_active = req.body.is_active;

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
   * GET /api/v1/members/search?org_id=xxx&q=searchTerm
   */
  async searchMembers(req, res, next) {
    try {
      const organizationId = req.query.org_id;
      const searchTerm = req.query.q;
      const limit = parseInt(req.query.limit) || 10;

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

      const members = await memberService.searchMembers(organizationId, searchTerm, limit);

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
      const organizationId = req.query.org_id;

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
