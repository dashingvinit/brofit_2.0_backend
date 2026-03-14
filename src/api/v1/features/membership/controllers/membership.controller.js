const membershipService = require("../services/membership.service");
const paymentService = require("../../../../../shared/services/payment.service");
const { requireOrgId } = require("../../../../../shared/helpers/auth.helper");

class MembershipController {
  // ─── Membership Endpoints ───────────────────────────────────

  createMembership = async (req, res, next) => {
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
  };

  getAllMemberships = async (req, res, next) => {
    try {
      const orgId = requireOrgId(req, res);
      if (!orgId) return;

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.memberId) filters.memberId = req.query.memberId;
      if (req.query.createdFrom) filters.createdFrom = req.query.createdFrom;
      if (req.query.createdTo) filters.createdTo = req.query.createdTo;

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
  };

  getMembershipById = async (req, res, next) => {
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
  };

  getMemberMemberships = async (req, res, next) => {
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
  };

  getActiveMembership = async (req, res, next) => {
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
  };

  getMembershipDues = async (req, res, next) => {
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
  };

  updateMembership = async (req, res, next) => {
    try {
      const { id } = req.params;
      const membership = await membershipService.updateMembership(
        id,
        req.body,
      );

      res.status(200).json({
        success: true,
        message: "Membership updated successfully",
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  };

  cancelMembership = async (req, res, next) => {
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
  };

  freezeMembership = async (req, res, next) => {
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
  };

  unfreezeMembership = async (req, res, next) => {
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
  };

  getExpiringMemberships = async (req, res, next) => {
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
  };

  getMembershipStats = async (req, res, next) => {
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
  };

  // ─── Payment Endpoints ──────────────────────────────────────

  recordPayment = async (req, res, next) => {
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
  };

  getPaymentById = async (req, res, next) => {
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
  };

  getPaymentsByMembership = async (req, res, next) => {
    try {
      const { id } = req.params;
      const payments =
        await paymentService.getPaymentsBySubscription(id, "membershipId");

      res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      next(error);
    }
  };

  getPaymentsByMember = async (req, res, next) => {
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
  };

  getAllPayments = async (req, res, next) => {
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
  };

  updatePaymentStatus = async (req, res, next) => {
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
  };
}

module.exports = new MembershipController();
