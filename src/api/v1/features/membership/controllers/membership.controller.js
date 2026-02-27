const membershipService = require("../services/membership.service");
const paymentService = require("../services/payment.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class MembershipController {
  constructor() {
    this.createMembership = this.createMembership.bind(this);
    this.getAllMemberships = this.getAllMemberships.bind(this);
    this.getMembershipById = this.getMembershipById.bind(this);
    this.getMemberMemberships = this.getMemberMemberships.bind(this);
    this.getActiveMembership = this.getActiveMembership.bind(this);
    this.getMembershipDues = this.getMembershipDues.bind(this);
    this.updateMembership = this.updateMembership.bind(this);
    this.cancelMembership = this.cancelMembership.bind(this);
    this.freezeMembership = this.freezeMembership.bind(this);
    this.unfreezeMembership = this.unfreezeMembership.bind(this);
    this.getExpiringMemberships = this.getExpiringMemberships.bind(this);
    this.getMembershipStats = this.getMembershipStats.bind(this);

    this.recordPayment = this.recordPayment.bind(this);
    this.getPaymentById = this.getPaymentById.bind(this);
    this.getPaymentsByMembership = this.getPaymentsByMembership.bind(this);
    this.getPaymentsByMember = this.getPaymentsByMember.bind(this);
    this.getAllPayments = this.getAllPayments.bind(this);
    this.updatePaymentStatus = this.updatePaymentStatus.bind(this);
  }

  // ─── Membership Endpoints ───────────────────────────────────

  async createMembership(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = {
        orgId,
        memberId: req.body.memberId,
        planVariantId: req.body.planVariantId,
        startDate: req.body.startDate,
        discountAmount: req.body.discountAmount,
        autoRenew: req.body.autoRenew,
        notes: req.body.notes,
        paymentAmount: req.body.paymentAmount,
        paymentMethod: req.body.paymentMethod,
        paymentReference: req.body.paymentReference,
        paymentNotes: req.body.paymentNotes,
      };

      const membership = await membershipService.createMembership(data);

      res.status(201).json({
        success: true,
        message: "Membership created successfully",
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllMemberships(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.memberId) filters.memberId = req.query.memberId;

      const result = await membershipService.getAllMemberships(
        orgId,
        page,
        limit,
        filters,
      );

      res.status(200).json({
        success: true,
        data: result.memberships,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembershipById(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await membershipService.getMembershipById(id);

      res.status(200).json({
        success: true,
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMemberMemberships(req, res, next) {
    try {
      const { memberId } = req.params;
      const memberships =
        await membershipService.getMemberMemberships(memberId);

      res.status(200).json({
        success: true,
        data: memberships,
      });
    } catch (error) {
      next(error);
    }
  }

  async getActiveMembership(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const { memberId } = req.params;
      const membership = await membershipService.getActiveMembership(
        memberId,
        orgId,
      );

      res.status(200).json({
        success: true,
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembershipDues(req, res, next) {
    try {
      const { id } = req.params;
      const dues = await membershipService.getMembershipDues(id);

      res.status(200).json({
        success: true,
        data: dues,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateMembership(req, res, next) {
    try {
      const { id } = req.params;
      const updateData = {};

      if (req.body.status !== undefined) updateData.status = req.body.status;
      if (req.body.autoRenew !== undefined)
        updateData.autoRenew = req.body.autoRenew;
      if (req.body.notes !== undefined) updateData.notes = req.body.notes;
      if (req.body.endDate !== undefined) updateData.endDate = req.body.endDate;

      const membership = await membershipService.updateMembership(
        id,
        updateData,
      );

      res.status(200).json({
        success: true,
        message: "Membership updated successfully",
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelMembership(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await membershipService.cancelMembership(id);

      res.status(200).json({
        success: true,
        message: "Membership cancelled successfully",
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  async freezeMembership(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await membershipService.freezeMembership(id);

      res.status(200).json({
        success: true,
        message: "Membership frozen successfully",
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  async unfreezeMembership(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await membershipService.unfreezeMembership(id);

      res.status(200).json({
        success: true,
        message: "Membership unfrozen successfully",
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  async getExpiringMemberships(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const daysAhead = parseInt(req.query.days) || 7;
      const memberships = await membershipService.getExpiringMemberships(
        orgId,
        daysAhead,
      );

      res.status(200).json({
        success: true,
        data: memberships,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMembershipStats(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const stats = await membershipService.getMembershipStats(orgId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  // ─── Payment Endpoints ──────────────────────────────────────

  async recordPayment(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const data = {
        orgId,
        memberId: req.body.memberId,
        membershipId: req.body.membershipId,
        amount: req.body.amount,
        method: req.body.method,
        status: req.body.status,
        reference: req.body.reference,
        notes: req.body.notes,
      };

      const payment = await paymentService.recordPayment(data);

      res.status(201).json({
        success: true,
        message: "Payment recorded successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentById(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await paymentService.getPaymentById(id);

      res.status(200).json({
        success: true,
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentsByMembership(req, res, next) {
    try {
      const { id } = req.params;
      const payments =
        await paymentService.getPaymentsByMembership(id);

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPaymentsByMember(req, res, next) {
    try {
      const { memberId } = req.params;
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;

      const result = await paymentService.getPaymentsByMember(
        memberId,
        page,
        limit,
      );

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllPayments(req, res, next) {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.memberId) filters.memberId = req.query.memberId;
      if (req.query.membershipId) filters.membershipId = req.query.membershipId;
      if (req.query.method) filters.method = req.query.method;

      const result = await paymentService.getAllPayments(
        orgId,
        page,
        limit,
        filters,
      );

      res.status(200).json({
        success: true,
        data: result.payments,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  async updatePaymentStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res
          .status(400)
          .json({ success: false, message: "Payment status is required" });
      }

      const payment = await paymentService.updatePaymentStatus(id, status);

      res.status(200).json({
        success: true,
        message: "Payment status updated successfully",
        data: payment,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MembershipController();
