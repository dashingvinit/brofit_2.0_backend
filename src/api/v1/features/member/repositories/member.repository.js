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

  async findByOrganization(organizationId, options = {}) {
    return await this.find(
      {
        orgId: organizationId,
        isActive: true,
      },
      {
        orderBy: { createdAt: "desc" },
        ...options,
      },
    );
  }

  async findByEmail(email) {
    return await this.findOne({ email });
  }

  async findByPhone(phone, organizationId) {
    return await this.findOne({
      phone,
      orgId: organizationId,
    });
  }

  async findActiveMembers(organizationId, page = 1, limit = 10) {
    return await this.findWithPagination(
      {
        orgId: organizationId,
        isActive: true,
      },
      {
        page,
        limit,
        orderBy: { createdAt: "desc" },
        include: {
          organization: true,
        },
      },
    );
  }

  async getMemberStats(organizationId) {
    const [totalMembers, activeMembers, inactiveMembers] = await Promise.all([
      this.count({ orgId: organizationId }),
      this.count({ orgId: organizationId, isActive: true }),
      this.count({ orgId: organizationId, isActive: false }),
    ]);

    return {
      total: totalMembers,
      active: activeMembers,
      inactive: inactiveMembers,
    };
  }

  async searchMembers(organizationId, searchTerm, limit = 10) {
    return await this.find(
      {
        orgId: organizationId,
        isActive: true,
        OR: [
          { firstName: { contains: searchTerm, mode: "insensitive" } },
          { lastName: { contains: searchTerm, mode: "insensitive" } },
          { email: { contains: searchTerm, mode: "insensitive" } },
          { phone: { contains: searchTerm } },
        ],
      },
      {
        take: limit,
        orderBy: { createdAt: "desc" },
      },
    );
  }
}

module.exports = new MemberRepository();
