const memberService = require("../services/member.service");
const { getAuth } = require("@clerk/express");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class MemberController {
  createMember = async (req, res, next) => {
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
        isActive: req.body.isActive,
        referredById: req.body.referredById || null,
      });

      res.status(201).json({
        success: true,
        message: "Member created successfully",
        data: member,
      });
    } catch (error) {
      next(error);
    }
  };

  getAllMembers = async (req, res, next) => {
    try {
      const organizationId = requireOrgId(req, res);
      if (!organizationId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      // isActive: "true" → active only, "false" → inactive only, omitted → all
      const isActive =
        req.query.isActive === "true"
          ? true
          : req.query.isActive === "false"
            ? false
            : null;
      const joinedFrom = req.query.joinedFrom || null;
      const joinedTo = req.query.joinedTo || null;

      const result = await memberService.getAllMembers(
        organizationId,
        page,
        limit,
        isActive,
        joinedFrom,
        joinedTo,
      );

      res.status(200).json({
        success: true,
        data: result.members,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  };

  getMemberById = async (req, res, next) => {
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
  };

  updateMember = async (req, res, next) => {
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
  };

  deleteMember = async (req, res, next) => {
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
  };

  searchMembers = async (req, res, next) => {
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
  };

  getMemberStats = async (req, res, next) => {
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
  };

  /**
   * Bulk import members from a JSON array (parsed from CSV on the client).
   * POST /api/v1/members/import
   * Body: { rows: Array<Record<string, string>> }
   */
  importMembers = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const auth = getAuth(req);
      const rows = req.body.rows;

      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Request body must contain a non-empty 'rows' array",
        });
      }

      const imported = [];
      const errors = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;

        const firstName = (row["First Name"] || row["firstName"] || "").trim();
        const lastName = (row["Last Name"] || row["lastName"] || "").trim();

        if (!firstName || !lastName) {
          errors.push(`Row ${rowNum}: First Name and Last Name are required`);
          continue;
        }

        try {
          const member = await memberService.createMember({
            orgId,
            orgSlug: auth.orgSlug,
            ownerUserId: auth.userId,
            clerkUserId: null,
            firstName,
            lastName,
            email: (row["Email"] || row["email"] || "").trim() || null,
            phone: (row["Phone"] || row["phone"] || "").trim() || "",
            dateOfBirth:
              (row["Date of Birth"] || row["dateOfBirth"] || "").trim() ||
              null,
            gender:
              (row["Gender"] || row["gender"] || "").trim() || "Not specified",
            joinDate:
              (row["Join Date"] || row["joinDate"] || "").trim() || new Date(),
            notes: (row["Notes"] || row["notes"] || "").trim() || null,
            isActive:
              (row["Is Active"] || row["isActive"] || "true").toLowerCase() !==
              "false",
          });
          imported.push(member);
        } catch (err) {
          errors.push(`Row ${rowNum} (${firstName} ${lastName}): ${err.message}`);
        }
      }

      res.status(200).json({
        success: true,
        message: `${imported.length} member(s) imported`,
        imported: imported.length,
        errors,
      });
    } catch (error) {
      next(error);
    }
  };
}

module.exports = new MemberController();
