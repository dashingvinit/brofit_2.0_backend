const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class MemberRepository extends CrudRepository {
  constructor() {
    super(prisma.member);
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
  ) {
    const whereClause = {
      orgId: organizationId,
    };

    // null → all members, true → active only, false → inactive only
    if (isActive !== null) {
      whereClause.isActive = isActive;
    }

    return await this.findWithPagination(whereClause, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        organization: true,
      },
    });
  }

  async getMemberStats(organizationId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalMembers, activeMembers, inactiveMembers, newThisMonth] =
      await Promise.all([
        this.count({ orgId: organizationId }),
        this.count({ orgId: organizationId, isActive: true }),
        this.count({ orgId: organizationId, isActive: false }),
        this.count({
          orgId: organizationId,
          createdAt: { gte: startOfMonth },
        }),
      ]);

    return {
      total: totalMembers,
      active: activeMembers,
      inactive: inactiveMembers,
      newThisMonth: newThisMonth,
    };
  }

  async searchMembers(
    organizationId,
    searchTerm,
    limit = 10,
    includeInactive = true,
  ) {
    const whereClause = {
      orgId: organizationId,
      OR: [
        { firstName: { contains: searchTerm, mode: "insensitive" } },
        { lastName: { contains: searchTerm, mode: "insensitive" } },
        { email: { contains: searchTerm, mode: "insensitive" } },
        { phone: { contains: searchTerm } },
      ],
    };

    // Only filter by isActive if includeInactive is false
    if (!includeInactive) {
      whereClause.isActive = true;
    }

    return await this.find(whereClause, {
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }
}

module.exports = new MemberRepository();
