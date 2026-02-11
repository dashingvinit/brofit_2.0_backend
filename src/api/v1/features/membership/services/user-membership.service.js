const userMembershipRepository = require('../repositories/user-membership.repository');
const membershipPlanRepository = require('../repositories/membership-plan.repository');

/**
 * User Membership Service
 * Business logic for user memberships
 */
class UserMembershipService {
  /**
   * Assign membership to user
   * @param {Object} membershipData - Membership data
   * @returns {Promise<Object>} Created membership
   */
  async assignMembership(membershipData) {
    // Verify plan exists
    const plan = await membershipPlanRepository.get(membershipData.planId);

    if (!plan) {
      throw new Error('Membership plan not found');
    }

    if (!plan.isActive) {
      throw new Error('Cannot assign inactive plan');
    }

    // Calculate end date based on plan duration
    const startDate = membershipData.startDate ? new Date(membershipData.startDate) : new Date();
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const dbData = {
      userId: membershipData.userId,
      membershipPlanId: membershipData.planId,
      organizationId: membershipData.organizationId,
      startDate: startDate,
      endDate: endDate,
      status: 'active',
      autoRenew: membershipData.autoRenew || false,
      amountPaid: membershipData.amountPaid || plan.price,
      paymentReference: membershipData.paymentReference,
      notes: membershipData.notes,
    };

    const membership = await userMembershipRepository.create(dbData);
    return this.sanitizeMembership(membership);
  }

  /**
   * Get user's membership history
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Membership history
   */
  async getUserMemberships(userId) {
    const memberships = await userMembershipRepository.findByUser(userId);
    return memberships.map(m => this.sanitizeMembership(m));
  }

  /**
   * Get user's active membership
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Active membership or null
   */
  async getUserActiveMembership(userId) {
    const membership = await userMembershipRepository.findActiveByUser(userId);
    return membership ? this.sanitizeMembership(membership) : null;
  }

  /**
   * Get membership by ID
   * @param {string} membershipId - Membership ID
   * @returns {Promise<Object>} Membership data
   */
  async getMembershipById(membershipId) {
    const membership = await userMembershipRepository.get(membershipId);

    if (!membership) {
      throw new Error('Membership not found');
    }

    return this.sanitizeMembership(membership);
  }

  /**
   * Get all memberships for organization
   * @param {string} organizationId - Organization ID
   * @param {string} status - Optional status filter
   * @returns {Promise<Array>} Memberships
   */
  async getOrganizationMemberships(organizationId, status = null) {
    const memberships = await userMembershipRepository.findByOrganization(organizationId, status);
    return memberships.map(m => this.sanitizeMembership(m));
  }

  /**
   * Renew membership
   * @param {string} membershipId - Current membership ID
   * @param {Object} renewalData - Renewal options
   * @returns {Promise<Object>} New membership
   */
  async renewMembership(membershipId, renewalData = {}) {
    const currentMembership = await userMembershipRepository.get(membershipId);

    if (!currentMembership) {
      throw new Error('Membership not found');
    }

    // Get the plan details
    const plan = await membershipPlanRepository.get(currentMembership.membershipPlanId);

    if (!plan) {
      throw new Error('Membership plan not found');
    }

    // Start new membership from current end date or now (whichever is later)
    const now = new Date();
    const currentEndDate = new Date(currentMembership.endDate);
    const startDate = currentEndDate > now ? currentEndDate : now;

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    // Create new membership
    const newMembershipData = {
      userId: currentMembership.userId,
      membershipPlanId: renewalData.planId || currentMembership.membershipPlanId,
      organizationId: currentMembership.organizationId,
      startDate: startDate,
      endDate: endDate,
      status: 'active',
      autoRenew: renewalData.autoRenew !== undefined ? renewalData.autoRenew : currentMembership.autoRenew,
      amountPaid: renewalData.amountPaid || plan.price,
      paymentReference: renewalData.paymentReference,
      notes: renewalData.notes || 'Renewed from previous membership',
    };

    // Mark old membership as expired if it's still active
    if (currentMembership.status === 'active') {
      await userMembershipRepository.updateStatus(membershipId, 'expired');
    }

    const newMembership = await userMembershipRepository.create(newMembershipData);
    return this.sanitizeMembership(newMembership);
  }

  /**
   * Cancel membership
   * @param {string} membershipId - Membership ID
   * @returns {Promise<Object>} Updated membership
   */
  async cancelMembership(membershipId) {
    const membership = await userMembershipRepository.get(membershipId);

    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.status === 'cancelled') {
      throw new Error('Membership is already cancelled');
    }

    const updated = await userMembershipRepository.updateStatus(membershipId, 'cancelled');
    return this.sanitizeMembership(updated);
  }

  /**
   * Suspend membership
   * @param {string} membershipId - Membership ID
   * @returns {Promise<Object>} Updated membership
   */
  async suspendMembership(membershipId) {
    const membership = await userMembershipRepository.get(membershipId);

    if (!membership) {
      throw new Error('Membership not found');
    }

    const updated = await userMembershipRepository.updateStatus(membershipId, 'suspended');
    return this.sanitizeMembership(updated);
  }

  /**
   * Reactivate suspended membership
   * @param {string} membershipId - Membership ID
   * @returns {Promise<Object>} Updated membership
   */
  async reactivateMembership(membershipId) {
    const membership = await userMembershipRepository.get(membershipId);

    if (!membership) {
      throw new Error('Membership not found');
    }

    if (membership.status !== 'suspended') {
      throw new Error('Only suspended memberships can be reactivated');
    }

    const updated = await userMembershipRepository.updateStatus(membershipId, 'active');
    return this.sanitizeMembership(updated);
  }

  /**
   * Get memberships expiring soon
   * @param {string} organizationId - Organization ID
   * @param {number} daysAhead - Days to look ahead
   * @returns {Promise<Array>} Expiring memberships
   */
  async getExpiringSoon(organizationId, daysAhead = 7) {
    const memberships = await userMembershipRepository.findExpiringSoon(organizationId, daysAhead);
    return memberships.map(m => this.sanitizeMembership(m));
  }

  /**
   * Get membership statistics
   * @param {string} organizationId - Organization ID
   * @returns {Promise<Object>} Membership statistics
   */
  async getMembershipStats(organizationId) {
    const stats = await userMembershipRepository.getMembershipStats(organizationId);
    return {
      totalMemberships: parseInt(stats.totalMemberships) || 0,
      activeCount: parseInt(stats.activeCount) || 0,
      expiredCount: parseInt(stats.expiredCount) || 0,
      cancelledCount: parseInt(stats.cancelledCount) || 0,
      suspendedCount: parseInt(stats.suspendedCount) || 0,
      totalRevenue: parseFloat(stats.totalRevenue) || 0,
      avgMembershipValue: parseFloat(stats.avgMembershipValue) || 0,
    };
  }

  /**
   * Sanitize membership data - ensures currency fields are proper float types
   * @param {Object} membership - Membership object
   * @returns {Object} Sanitized membership
   */
  sanitizeMembership(membership) {
    if (!membership) return null;

    return {
      ...membership,
      // Type conversion for currency fields
      amountPaid: membership.amountPaid ? parseFloat(membership.amountPaid) : null,
      planPrice: membership.planPrice ? parseFloat(membership.planPrice) : null,
    };
  }
}

module.exports = new UserMembershipService();
