const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");
const {
  getStartOfCurrentMonth,
} = require("../../../../../shared/helpers/subscription.helper");

const SEARCH_POOL_LIMIT = 2000;

class MemberRepository extends CrudRepository {
  constructor() {
    super(prisma.member);
  }

  async findByIdWithReferral(memberId) {
    return await this.model.findUnique({
      where: { id: memberId },
      include: {
        referredBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
  }

  async findByClerkId(clerkUserId) {
    return await this.findOne({ clerkUserId });
  }

  async findByClerkIdAndOrg(clerkUserId, organizationId) {
    return await this.findOne({
      clerkUserId,
      orgId: organizationId,
    });
  }

  async findActiveMembers(
    organizationId,
    page = 1,
    limit = 10,
    isActive = null,
    joinedFrom = null,
    joinedTo = null,
    planTypeId = null,
    hasDiscount = false,
    noMembership = false,
  ) {
    const whereClause = {
      orgId: organizationId,
    };

    // null → all members, true → active only, false → inactive only
    if (isActive !== null) {
      whereClause.isActive = isActive;
    }

    if (joinedFrom || joinedTo) {
      whereClause.joinDate = {};
      if (joinedFrom) whereClause.joinDate.gte = new Date(joinedFrom);
      if (joinedTo) whereClause.joinDate.lte = new Date(joinedTo);
    }

    if (noMembership) {
      // Active members with no active membership
      whereClause.isActive = true;
      whereClause.memberships = { none: { status: "active" } };
    } else if (planTypeId || hasDiscount) {
      // Filter: members who currently hold an active membership of a given plan type
      const membershipSome = { status: "active" };
      if (planTypeId) {
        membershipSome.planVariant = { planTypeId };
      }
      if (hasDiscount) {
        membershipSome.discountAmount = { gt: 0 };
      }
      whereClause.memberships = { some: membershipSome };
    }

    return await this.findWithPagination(whereClause, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });
  }

  async getMemberStats(organizationId) {
    const startOfMonth = getStartOfCurrentMonth();

    const [totalMembers, activeMembers, inactiveMembers, newThisMonth] =
      await Promise.all([
        this.count({ orgId: organizationId }),
        this.count({ orgId: organizationId, isActive: true }),
        this.count({ orgId: organizationId, isActive: false }),
        this.count({
          orgId: organizationId,
          joinDate: { gte: startOfMonth },
        }),
      ]);

    return {
      total: totalMembers,
      active: activeMembers,
      inactive: inactiveMembers,
      newThisMonth: newThisMonth,
    };
  }

  async searchMembers(organizationId, includeInactive = true) {
    const whereClause = {
      orgId: organizationId,
    };

    // Only filter by isActive if includeInactive is false
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    return await this.model.findMany({
      where: whereClause,
      take: SEARCH_POOL_LIMIT,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        lastName: true,
        phone: true,
        email: true,
        dateOfBirth: true,
        gender: true,
        joinDate: true,
        notes: true,
        isActive: true,
        referredById: true,
        createdAt: true,
        memberships: {
          where: { status: "active" },
          take: 1,
          orderBy: { startDate: "desc" },
          select: {
            id: true,
            status: true,
            planVariant: {
              select: {
                durationLabel: true,
                planType: { select: { name: true, category: true } },
              },
            },
          },
        },
      },
    });
  }
}

module.exports = new MemberRepository();
