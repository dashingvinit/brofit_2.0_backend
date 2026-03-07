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

  /**
   * Sum paid revenue in a date range (paidAt window).
   */
  async sumInRange(orgId, from, to) {
    const result = await prisma.payment.aggregate({
      where: { orgId, status: "paid", paidAt: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  /**
   * Sum paid revenue grouped by year+month for a date range.
   * Returns a Map keyed by "YYYY-M" -> total amount.
   * Single query replacing N per-month sumInRange calls.
   */
  async revenueByMonths(orgId, from, to) {
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR  FROM "paidAt")::int AS year,
        EXTRACT(MONTH FROM "paidAt")::int AS month,
        COALESCE(SUM(amount), 0)          AS total
      FROM "Payment"
      WHERE "orgId" = ${orgId}
        AND status  = 'paid'
        AND "paidAt" >= ${from}
        AND "paidAt" <= ${to}
      GROUP BY year, month
    `;
    const map = new Map();
    for (const r of rows) {
      map.set(`${r.year}-${r.month}`, Number(r.total));
    }
    return map;
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
