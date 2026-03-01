const { prisma } = require("../../../../../config/prisma.config");

class ReportsRepository {
  /**
   * Bulk-expire memberships where endDate has passed and status is still "active".
   * Returns the count of updated records.
   */
  async expireStaleMemberships(orgId) {
    const now = new Date();
    const result = await prisma.membership.updateMany({
      where: {
        orgId,
        status: "active",
        endDate: { lt: now },
      },
      data: { status: "expired" },
    });
    return result.count;
  }

  /**
   * Bulk-expire trainings where endDate has passed and status is still "active".
   * Returns the count of updated records.
   */
  async expireStaleTrainings(orgId) {
    const now = new Date();
    const result = await prisma.training.updateMany({
      where: {
        orgId,
        status: "active",
        endDate: { lt: now },
      },
      data: { status: "expired" },
    });
    return result.count;
  }

  /**
   * Find active members who have zero active memberships AND zero active trainings.
   * Returns their IDs.
   */
  async findMembersWithNoActiveSubs(orgId) {
    const members = await prisma.member.findMany({
      where: {
        orgId,
        isActive: true,
        memberships: { none: { status: "active" } },
        trainings: { none: { status: "active" } },
      },
      select: { id: true },
    });
    return members.map((m) => m.id);
  }

  /**
   * Deactivate members by IDs. Returns count updated.
   */
  async deactivateMembers(memberIds) {
    if (memberIds.length === 0) return 0;
    const result = await prisma.member.updateMany({
      where: { id: { in: memberIds } },
      data: { isActive: false },
    });
    return result.count;
  }

  /**
   * Find active members with no active subscriptions (inactive candidates).
   * Paginated, includes latest expired subscription date.
   */
  async findInactiveCandidates(orgId, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const where = {
      orgId,
      isActive: true,
      memberships: { none: { status: "active" } },
      trainings: { none: { status: "active" } },
    };

    const [data, total] = await Promise.all([
      prisma.member.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          memberships: {
            orderBy: { endDate: "desc" },
            take: 1,
            select: { id: true, status: true, endDate: true },
          },
          trainings: {
            orderBy: { endDate: "desc" },
            take: 1,
            select: { id: true, status: true, endDate: true },
          },
        },
      }),
      prisma.member.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Get all members with outstanding dues across memberships and trainings.
   * Optionally filter by a specific memberId.
   */
  async getMembersWithDues(orgId, page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;

    // Build member filter
    const memberWhere = { orgId };
    if (filters.memberId) memberWhere.id = filters.memberId;

    // Get members with their memberships/trainings + payments
    const members = await prisma.member.findMany({
      where: memberWhere,
      orderBy: { firstName: "asc" },
      include: {
        memberships: {
          include: {
            payments: { where: { status: "paid" } },
            planVariant: { include: { planType: true } },
          },
        },
        trainings: {
          include: {
            payments: { where: { status: "paid" } },
            planVariant: { include: { planType: true } },
          },
        },
      },
    });

    // Calculate dues per member
    const membersWithDues = [];
    for (const member of members) {
      let membershipDuesTotal = 0;
      let trainingDuesTotal = 0;

      const membershipDues = [];
      for (const ms of member.memberships) {
        const paid = ms.payments.reduce((sum, p) => sum + p.amount, 0);
        const due = Math.max(0, ms.finalPrice - paid);
        if (due > 0) {
          membershipDuesTotal += due;
          membershipDues.push({
            id: ms.id,
            planName: ms.planVariant?.planType?.name || "Unknown",
            variantName: ms.planVariant?.durationLabel || "Unknown",
            finalPrice: ms.finalPrice,
            totalPaid: paid,
            dueAmount: due,
            status: ms.status,
            endDate: ms.endDate,
          });
        }
      }

      const trainingDues = [];
      for (const tr of member.trainings) {
        const paid = tr.payments.reduce((sum, p) => sum + p.amount, 0);
        const due = Math.max(0, tr.finalPrice - paid);
        if (due > 0) {
          trainingDuesTotal += due;
          trainingDues.push({
            id: tr.id,
            planName: tr.planVariant?.planType?.name || "Unknown",
            variantName: tr.planVariant?.durationLabel || "Unknown",
            finalPrice: tr.finalPrice,
            totalPaid: paid,
            dueAmount: due,
            status: tr.status,
            endDate: tr.endDate,
          });
        }
      }

      const totalDue = membershipDuesTotal + trainingDuesTotal;
      if (totalDue > 0) {
        membersWithDues.push({
          memberId: member.id,
          firstName: member.firstName,
          lastName: member.lastName,
          phone: member.phone,
          email: member.email,
          isActive: member.isActive,
          totalDue,
          membershipDuesTotal,
          trainingDuesTotal,
          membershipDues,
          trainingDues,
        });
      }
    }

    // Sort by totalDue descending (highest dues first)
    membersWithDues.sort((a, b) => b.totalDue - a.totalDue);

    // Manual pagination on the filtered results
    const total = membersWithDues.length;
    const paginatedData = membersWithDues.slice(skip, skip + limit);
    const grandTotal = membersWithDues.reduce((sum, m) => sum + m.totalDue, 0);

    return {
      data: paginatedData,
      summary: {
        totalMembersWithDues: total,
        grandTotal,
      },
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }
}

module.exports = new ReportsRepository();
