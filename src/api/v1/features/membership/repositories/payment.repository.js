const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class PaymentRepository extends CrudRepository {
  constructor() {
    super(prisma.payment);
  }

  async findByMembership(membershipId) {
    return await this.find(
      { membershipId },
      {
        orderBy: { createdAt: "desc" },
      },
    );
  }

  async findByMember(memberId, page = 1, limit = 10) {
    return await this.findWithPagination(
      { memberId },
      {
        page,
        limit,
        orderBy: { createdAt: "desc" },
        include: { membership: { include: { planVariant: { include: { planType: true } } } } },
      },
    );
  }

  async findByOrganization(orgId, page = 1, limit = 10, filters = {}) {
    const where = { orgId };

    if (filters.status) where.status = filters.status;
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.membershipId) where.membershipId = filters.membershipId;
    if (filters.method) where.method = filters.method;

    return await this.findWithPagination(where, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        member: true,
        membership: { include: { planVariant: { include: { planType: true } } } },
      },
    });
  }

  async getPaidAmountForMembership(membershipId) {
    const result = await prisma.payment.aggregate({
      where: {
        membershipId,
        status: "paid",
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  async getPaymentStats(orgId) {
    // Calculate start of current month in UTC
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const [totalCollected, collectedThisMonth] = await Promise.all([
      prisma.payment.aggregate({
        where: { orgId, status: "paid" },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          orgId,
          status: "paid",
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCollected: totalCollected._sum.amount || 0,
      collectedThisMonth: collectedThisMonth._sum.amount || 0,
    };
  }
}

module.exports = new PaymentRepository();
