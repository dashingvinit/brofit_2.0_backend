const reportsRepository = require("../repositories/reports.repository");

class ReportsService {
  /**
   * Expire all stale memberships and trainings, then deactivate members
   * who have no remaining active subscriptions.
   */
  async expireSubscriptions(orgId) {
    // 1. Bulk-expire stale memberships and trainings
    const [expiredMemberships, expiredTrainings] = await Promise.all([
      reportsRepository.expireStaleMemberships(orgId),
      reportsRepository.expireStaleTrainings(orgId),
    ]);

    // 2. Find and deactivate members with no active subs
    const memberIds =
      await reportsRepository.findMembersWithNoActiveSubs(orgId);
    const deactivatedMembers =
      await reportsRepository.deactivateMembers(memberIds);

    return {
      expiredMemberships,
      expiredTrainings,
      deactivatedMembers,
    };
  }

  /**
   * Get active members who have no active memberships or trainings.
   */
  async getInactiveCandidates(orgId, page = 1, limit = 10) {
    const result = await reportsRepository.findInactiveCandidates(
      orgId,
      page,
      limit,
    );

    // Format the response to include latest subscription info
    const candidates = result.data.map((member) => {
      const latestMembership = member.memberships[0] || null;
      const latestTraining = member.trainings[0] || null;

      // Pick the most recent end date from either
      let lastSubscriptionEnd = null;
      if (latestMembership && latestTraining) {
        lastSubscriptionEnd =
          latestMembership.endDate > latestTraining.endDate
            ? latestMembership.endDate
            : latestTraining.endDate;
      } else if (latestMembership) {
        lastSubscriptionEnd = latestMembership.endDate;
      } else if (latestTraining) {
        lastSubscriptionEnd = latestTraining.endDate;
      }

      return {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        joinDate: member.joinDate,
        lastSubscriptionEnd,
        latestMembership,
        latestTraining,
      };
    });

    return {
      members: candidates,
      pagination: result.pagination,
    };
  }

  /**
   * Get all members with outstanding dues.
   */
  async getDuesReport(orgId, page = 1, limit = 10, filters = {}) {
    return await reportsRepository.getMembersWithDues(
      orgId,
      page,
      limit,
      filters,
    );
  }

  /**
   * Record a daily activity snapshot for an org.
   * Called by the cron job after expireSubscriptions().
   */
  async takeActivitySnapshot(orgId, { expiredMemberships = 0, expiredTrainings = 0 } = {}) {
    const counts = await reportsRepository.getMemberCounts(orgId);
    const snapshotDate = new Date();
    snapshotDate.setHours(0, 0, 0, 0);

    return reportsRepository.upsertDailySnapshot({
      orgId,
      snapshotDate,
      totalMembers: counts.total,
      activeMembers: counts.active,
      inactiveMembers: counts.inactive,
      newlyExpired: expiredMemberships + expiredTrainings,
    });
  }

  /**
   * Get daily activity trend for the last N days.
   */
  async getActivityTrend(orgId, days = 30) {
    return reportsRepository.getActivityTrend(orgId, days);
  }
}

module.exports = new ReportsService();
