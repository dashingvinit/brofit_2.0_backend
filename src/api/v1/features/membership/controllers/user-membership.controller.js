const userMembershipService = require('../services/user-membership.service');

/**
 * User Membership Controller
 * Handles HTTP requests for user memberships
 */
class UserMembershipController {
  /**
   * Assign membership to user
   * POST /api/v1/memberships/users/:userId
   */
  async assignMembership(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;
      const { userId } = req.params;

      const membershipData = {
        userId,
        organizationId,
        planId: req.body.planId,
        startDate: req.body.startDate,
        autoRenew: req.body.autoRenew,
        amountPaid: req.body.amountPaid,
        paymentReference: req.body.paymentReference,
        notes: req.body.notes,
      };

      const membership = await userMembershipService.assignMembership(membershipData);

      res.status(201).json({
        success: true,
        message: 'Membership assigned successfully',
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's membership history
   * GET /api/v1/memberships/users/:userId
   */
  async getUserMemberships(req, res, next) {
    try {
      const { userId } = req.params;
      const memberships = await userMembershipService.getUserMemberships(userId);

      res.status(200).json({
        success: true,
        data: memberships,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user's active membership
   * GET /api/v1/memberships/users/:userId/active
   */
  async getUserActiveMembership(req, res, next) {
    try {
      const { userId } = req.params;
      const membership = await userMembershipService.getUserActiveMembership(userId);

      if (!membership) {
        return res.status(404).json({
          success: false,
          message: 'No active membership found',
        });
      }

      res.status(200).json({
        success: true,
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all memberships in organization
   * GET /api/v1/memberships
   */
  async getOrganizationMemberships(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;
      const { status } = req.query;

      const memberships = await userMembershipService.getOrganizationMemberships(
        organizationId,
        status
      );

      res.status(200).json({
        success: true,
        data: memberships,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Renew membership
   * POST /api/v1/memberships/:id/renew
   */
  async renewMembership(req, res, next) {
    try {
      const { id } = req.params;

      const renewalData = {
        planId: req.body.planId,
        autoRenew: req.body.autoRenew,
        amountPaid: req.body.amountPaid,
        paymentReference: req.body.paymentReference,
        notes: req.body.notes,
      };

      const membership = await userMembershipService.renewMembership(id, renewalData);

      res.status(201).json({
        success: true,
        message: 'Membership renewed successfully',
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel membership
   * POST /api/v1/memberships/:id/cancel
   */
  async cancelMembership(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await userMembershipService.cancelMembership(id);

      res.status(200).json({
        success: true,
        message: 'Membership cancelled successfully',
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Suspend membership
   * POST /api/v1/memberships/:id/suspend
   */
  async suspendMembership(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await userMembershipService.suspendMembership(id);

      res.status(200).json({
        success: true,
        message: 'Membership suspended successfully',
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reactivate membership
   * POST /api/v1/memberships/:id/reactivate
   */
  async reactivateMembership(req, res, next) {
    try {
      const { id } = req.params;
      const membership = await userMembershipService.reactivateMembership(id);

      res.status(200).json({
        success: true,
        message: 'Membership reactivated successfully',
        data: membership,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get memberships expiring soon
   * GET /api/v1/memberships/expiring
   */
  async getExpiringSoon(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;
      const daysAhead = parseInt(req.query.days) || 7;

      const memberships = await userMembershipService.getExpiringSoon(
        organizationId,
        daysAhead
      );

      res.status(200).json({
        success: true,
        data: memberships,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get membership statistics
   * GET /api/v1/memberships/stats
   */
  async getMembershipStats(req, res, next) {
    try {
      // Use orgId if available, otherwise use userId as fallback
      const organizationId = req.auth.orgId || req.auth.userId;

      const stats = await userMembershipService.getMembershipStats(organizationId);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new UserMembershipController();
