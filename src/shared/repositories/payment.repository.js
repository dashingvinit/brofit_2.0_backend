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
   * Sum paid revenue in a date range, attributed by subscription start date.
   * Membership/training payments are grouped by their start_date, not paid_at.
   */
  async sumInRange(orgId, from, to) {
    const [membershipResult, trainingResult] = await Promise.all([
      prisma.$queryRaw`
        SELECT COALESCE(SUM(p.amount), 0) AS total
        FROM payments p
        JOIN memberships m ON m.id = p.membership_id
        WHERE p.org_id        = ${orgId}
          AND p.status         = 'paid'
          AND p.membership_id IS NOT NULL
          AND m.start_date   >= ${from}
          AND m.start_date   <= ${to}
      `,
      prisma.$queryRaw`
        SELECT COALESCE(SUM(p.amount), 0) AS total
        FROM payments p
        JOIN trainings t ON t.id = p.training_id
        WHERE p.org_id      = ${orgId}
          AND p.status       = 'paid'
          AND p.training_id IS NOT NULL
          AND t.start_date >= ${from}
          AND t.start_date <= ${to}
      `,
    ]);
    return Number(membershipResult[0]?.total || 0) + Number(trainingResult[0]?.total || 0);
  }

  /**
   * Sum paid revenue grouped by year+month for a date range, attributed by subscription start date.
   * Returns a Map keyed by "YYYY-M" -> total amount.
   */
  async revenueByMonths(orgId, from, to) {
    const [membershipRows, trainingRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          EXTRACT(YEAR  FROM m.start_date)::int AS year,
          EXTRACT(MONTH FROM m.start_date)::int AS month,
          COALESCE(SUM(p.amount), 0)            AS total
        FROM payments p
        JOIN memberships m ON m.id = p.membership_id
        WHERE p.org_id        = ${orgId}
          AND p.status         = 'paid'
          AND p.membership_id IS NOT NULL
          AND m.start_date   >= ${from}
          AND m.start_date   <= ${to}
        GROUP BY year, month
      `,
      prisma.$queryRaw`
        SELECT
          EXTRACT(YEAR  FROM t.start_date)::int AS year,
          EXTRACT(MONTH FROM t.start_date)::int AS month,
          COALESCE(SUM(p.amount), 0)            AS total
        FROM payments p
        JOIN trainings t ON t.id = p.training_id
        WHERE p.org_id      = ${orgId}
          AND p.status       = 'paid'
          AND p.training_id IS NOT NULL
          AND t.start_date >= ${from}
          AND t.start_date <= ${to}
        GROUP BY year, month
      `,
    ]);
    const map = new Map();
    for (const r of membershipRows) {
      const key = `${r.year}-${r.month}`;
      map.set(key, (map.get(key) || 0) + Number(r.total));
    }
    for (const r of trainingRows) {
      const key = `${r.year}-${r.month}`;
      map.set(key, (map.get(key) || 0) + Number(r.total));
    }
    return map;
  }

  async getPaymentStats(orgId, { trainingOnly = false, membershipOnly = false } = {}) {
    const startOfMonth = getStartOfCurrentMonth();
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0, 23, 59, 59, 999);
    const epoch = new Date(0);

    if (trainingOnly) {
      const [totalResult, monthResult] = await Promise.all([
        prisma.$queryRaw`
          SELECT COALESCE(SUM(p.amount), 0) AS total
          FROM payments p
          JOIN trainings t ON t.id = p.training_id
          WHERE p.org_id      = ${orgId}
            AND p.status       = 'paid'
            AND p.training_id IS NOT NULL
            AND t.start_date >= ${epoch}
        `,
        prisma.$queryRaw`
          SELECT COALESCE(SUM(p.amount), 0) AS total
          FROM payments p
          JOIN trainings t ON t.id = p.training_id
          WHERE p.org_id      = ${orgId}
            AND p.status       = 'paid'
            AND p.training_id IS NOT NULL
            AND t.start_date >= ${startOfMonth}
            AND t.start_date <= ${endOfMonth}
        `,
      ]);
      return {
        totalCollected: Number(totalResult[0]?.total || 0),
        collectedThisMonth: Number(monthResult[0]?.total || 0),
      };
    }

    if (membershipOnly) {
      const [totalResult, monthResult] = await Promise.all([
        prisma.$queryRaw`
          SELECT COALESCE(SUM(p.amount), 0) AS total
          FROM payments p
          JOIN memberships m ON m.id = p.membership_id
          WHERE p.org_id        = ${orgId}
            AND p.status         = 'paid'
            AND p.membership_id IS NOT NULL
            AND m.start_date   >= ${epoch}
        `,
        prisma.$queryRaw`
          SELECT COALESCE(SUM(p.amount), 0) AS total
          FROM payments p
          JOIN memberships m ON m.id = p.membership_id
          WHERE p.org_id        = ${orgId}
            AND p.status         = 'paid'
            AND p.membership_id IS NOT NULL
            AND m.start_date   >= ${startOfMonth}
            AND m.start_date   <= ${endOfMonth}
        `,
      ]);
      return {
        totalCollected: Number(totalResult[0]?.total || 0),
        collectedThisMonth: Number(monthResult[0]?.total || 0),
      };
    }

    // Combined (no filter)
    const [totalCollected, collectedThisMonth] = await Promise.all([
      this.sumInRange(orgId, epoch, new Date()),
      this.sumInRange(orgId, startOfMonth, endOfMonth),
    ]);
    return { totalCollected, collectedThisMonth };
  }
}

module.exports = new PaymentRepository();
