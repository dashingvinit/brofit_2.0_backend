const { prisma } = require("../../../../../config/prisma.config");
const { countActiveMembers } = require("../../../../../shared/helpers/subscription.helper");

class AnalyticsRepository {
  // ─── Top Plans ─────────────────────────────────────────────────────────────

  async getTopPlans(orgId, since) {
    const [membershipGroups, trainingGroups] = await Promise.all([
      prisma.membership.groupBy({
        by: ["planVariantId"],
        where: { orgId, createdAt: { gte: since } },
        _count: { id: true },
        _sum: { finalPrice: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
      prisma.training.groupBy({
        by: ["planVariantId"],
        where: { orgId, createdAt: { gte: since } },
        _count: { id: true },
        _sum: { finalPrice: true },
        orderBy: { _count: { id: "desc" } },
        take: 10,
      }),
    ]);

    const variantIds = [
      ...new Set([
        ...membershipGroups.map((g) => g.planVariantId),
        ...trainingGroups.map((g) => g.planVariantId),
      ]),
    ];

    const variants = await prisma.planVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        durationLabel: true,
        planType: { select: { name: true, category: true } },
      },
    });

    const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));
    return { membershipGroups, trainingGroups, variantMap };
  }

  // ─── Retention ─────────────────────────────────────────────────────────────

  async getRetention(orgId) {
    const [membershipCounts, activeNow, totalMembers] = await Promise.all([
      prisma.membership.groupBy({
        by: ["memberId"],
        where: { orgId },
        _count: { id: true },
      }),
      countActiveMembers(orgId),
      prisma.member.count({ where: { orgId } }),
    ]);

    return { membershipCounts, activeNow, totalMembers };
  }

  // ─── Revenue Breakdown ─────────────────────────────────────────────────────

  /**
   * Revenue split by membership vs training, grouped by year+month.
   * Uses actual payment paidAt for accurate cash-basis accounting.
   * Returns a Map keyed by "YYYY-M" -> { membership, training }.
   * 2 queries total instead of N×2 per-month calls.
   */
  async getRevenueByCategoryByMonths(orgId, from, to) {
    const [membershipRows, trainingRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          EXTRACT(YEAR  FROM paid_at)::int AS year,
          EXTRACT(MONTH FROM paid_at)::int AS month,
          COALESCE(SUM(amount), 0)         AS total
        FROM payments
        WHERE org_id        = ${orgId}
          AND status         = 'paid'
          AND membership_id IS NOT NULL
          AND paid_at      >= ${from}
          AND paid_at      <= ${to}
        GROUP BY year, month
      `,
      prisma.$queryRaw`
        SELECT
          EXTRACT(YEAR  FROM paid_at)::int AS year,
          EXTRACT(MONTH FROM paid_at)::int AS month,
          COALESCE(SUM(amount), 0)         AS total
        FROM payments
        WHERE org_id      = ${orgId}
          AND status       = 'paid'
          AND training_id IS NOT NULL
          AND paid_at    >= ${from}
          AND paid_at    <= ${to}
        GROUP BY year, month
      `,
    ]);

    const map = new Map();
    for (const r of membershipRows) {
      const key = `${r.year}-${r.month}`;
      map.set(key, { membership: Number(r.total), training: 0 });
    }
    for (const r of trainingRows) {
      const key = `${r.year}-${r.month}`;
      const entry = map.get(key) || { membership: 0, training: 0 };
      entry.training = Number(r.total);
      map.set(key, entry);
    }
    return map;
  }

  // ─── Payment Methods ────────────────────────────────────────────────────────

  async getPaymentMethods(orgId) {
    return prisma.payment.groupBy({
      by: ["method"],
      where: { orgId, status: "paid" },
      _count: { id: true },
      _sum: { amount: true },
      orderBy: { _sum: { amount: "desc" } },
    });
  }

  // ─── Trainer Performance ───────────────────────────────────────────────────

  async getTrainerPerformance(orgId) {
    const trainers = await prisma.trainer.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true },
    });

    const trainerIds = trainers.map((t) => t.id);

    const [trainingGroups, activeGroups] = await Promise.all([
      prisma.training.groupBy({
        by: ["trainerId"],
        where: { orgId, trainerId: { in: trainerIds } },
        _count: { id: true },
        _sum: { finalPrice: true },
      }),
      prisma.training.groupBy({
        by: ["trainerId"],
        where: { orgId, trainerId: { in: trainerIds }, status: "active" },
        _count: { id: true },
      }),
    ]);

    return { trainers, trainingGroups, activeGroups };
  }

  // ─── Member Growth ─────────────────────────────────────────────────────────

  /**
   * Count new members grouped by year+month for a date range.
   * Returns a Map keyed by "YYYY-M" -> count.
   * Single query replacing N per-month count calls.
   */
  async getNewMembersByMonths(orgId, from, to) {
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR  FROM join_date)::int AS year,
        EXTRACT(MONTH FROM join_date)::int AS month,
        COUNT(*)::int                      AS count
      FROM members
      WHERE org_id    = ${orgId}
        AND join_date >= ${from}
        AND join_date <= ${to}
      GROUP BY year, month
    `;
    const map = new Map();
    for (const r of rows) {
      map.set(`${r.year}-${r.month}`, Number(r.count));
    }
    return map;
  }

  // ─── Demographics ──────────────────────────────────────────────────────────

  async getDemographics(orgId) {
    return prisma.member.findMany({
      where: { orgId },
      select: { gender: true, dateOfBirth: true },
    });
  }
}

module.exports = new AnalyticsRepository();
