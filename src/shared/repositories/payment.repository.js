const CrudRepository = require("./crud.repository");
const { prisma } = require("../../config/prisma.config");
const { getStartOfCurrentMonth } = require("../helpers/subscription.helper");

class PaymentRepository extends CrudRepository {
  constructor() {
    super(prisma.payment);
  }

  async findBySubscription(subscriptionId, field = "membershipId") {
    return await this.find(
      { [field]: subscriptionId },
      {
        orderBy: { createdAt: "desc" },
      },
    );
  }

  async findByMember(memberId, page = 1, limit = 10, { trainingOnly = false } = {}) {
    const where = { memberId };
    const include = trainingOnly
      ? { training: { include: { planVariant: { include: { planType: true } } } } }
      : { membership: { include: { planVariant: { include: { planType: true } } } } };

    if (trainingOnly) {
      where.trainingId = { not: null };
    }

    return await this.findWithPagination(where, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include,
    });
  }

  async findByOrganization(orgId, page = 1, limit = 10, filters = {}, { trainingOnly = false } = {}) {
    const where = { orgId };

    if (trainingOnly) {
      where.trainingId = { not: null };
    }

    if (filters.status) where.status = filters.status;
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.membershipId) where.membershipId = filters.membershipId;
    if (filters.trainingId) where.trainingId = filters.trainingId;
    if (filters.method) where.method = filters.method;

    const include = trainingOnly
      ? {
          member: true,
          training: { include: { planVariant: { include: { planType: true } } } },
        }
      : {
          member: true,
          membership: { include: { planVariant: { include: { planType: true } } } },
        };

    return await this.findWithPagination(where, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include,
    });
  }

  async getPaidAmountForSubscription(subscriptionId, field = "membershipId") {
    const result = await prisma.payment.aggregate({
      where: {
        [field]: subscriptionId,
        status: "paid",
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  async getPaymentStats(orgId, { trainingOnly = false, membershipOnly = false } = {}) {
    const startOfMonth = getStartOfCurrentMonth();
    const baseWhere = { orgId, status: "paid" };

    if (trainingOnly) {
      baseWhere.trainingId = { not: null };
    } else if (membershipOnly) {
      baseWhere.membershipId = { not: null };
    }

    const [totalCollected, collectedThisMonth] = await Promise.all([
      prisma.payment.aggregate({
        where: baseWhere,
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...baseWhere,
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
