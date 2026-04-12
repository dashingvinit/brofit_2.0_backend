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

  // ─── Membership Duration Preference ───────────────────────────────────────

  async getMembershipDurationPreference(orgId) {
    const groups = await prisma.membership.groupBy({
      by: ["planVariantId"],
      where: { orgId },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const variantIds = groups.map((g) => g.planVariantId);
    const variants = await prisma.planVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        durationLabel: true,
        durationDays: true,
        planType: { select: { name: true } },
      },
    });

    return { groups, variants };
  }

  // ─── Unit Economics Inputs ─────────────────────────────────────────────────

  /**
   * Returns the raw inputs needed for unit economics + projection within a window.
   * Single method so projection.service can get everything in 3 parallel queries.
   *
   * Returns:
   *   activeMembers  – current active member count
   *   totalRevenue   – sum of paid revenue in window
   *   newJoins       – array of { year, month, count } in window
   *   expiredPerMonth – avg memberships that lapsed per month in window (proxy for churn events)
   */
  async getUnitEconomicsInputs(orgId, windowMonths) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (windowMonths - 1), 1);

    const [activeMembers, revenueRows, newJoinRows, expiredRows] = await Promise.all([
      countActiveMembers(orgId),
      prisma.$queryRaw`
        SELECT COALESCE(SUM(p.amount), 0) AS total
        FROM payments p
        JOIN memberships m ON m.id = p.membership_id
        WHERE p.org_id = ${orgId} AND p.status = 'paid'
          AND m.start_date >= ${from}
        UNION ALL
        SELECT COALESCE(SUM(p.amount), 0) AS total
        FROM payments p
        JOIN trainings t ON t.id = p.training_id
        WHERE p.org_id = ${orgId} AND p.status = 'paid'
          AND t.start_date >= ${from}
      `,
      prisma.$queryRaw`
        SELECT EXTRACT(YEAR FROM join_date)::int  AS year,
               EXTRACT(MONTH FROM join_date)::int AS month,
               COUNT(*)::int                      AS count
        FROM members
        WHERE org_id = ${orgId} AND join_date >= ${from}
        GROUP BY year, month
        ORDER BY year, month
      `,
      prisma.$queryRaw`
        SELECT EXTRACT(YEAR FROM end_date)::int  AS year,
               EXTRACT(MONTH FROM end_date)::int AS month,
               COUNT(*)::int                     AS count
        FROM memberships
        WHERE org_id = ${orgId}
          AND status IN ('expired', 'cancelled')
          AND end_date >= ${from} AND end_date <= ${now}
        GROUP BY year, month
      `,
    ]);

    const totalRevenue = revenueRows.reduce((s, r) => s + Number(r.total), 0);
    return { activeMembers, totalRevenue, newJoinRows, expiredRows, windowMonths };
  }

  // ─── Discounts ─────────────────────────────────────────────────────────────

  /**
   * Discounts given by month, split by offer-driven vs flat, for memberships and trainings.
   * Attribution is on start_date (matches how revenue-breakdown attributes revenue).
   *
   * Uses partial indexes on (org_id, start_date) WHERE discount_amount > 0, so the
   * scan cost is bounded by the number of discounted rows, not the total row count.
   * Two queries, run in parallel.
   *
   * Returns a Map keyed by "YYYY-M" → {
   *   membershipOffer, membershipFlat, trainingOffer, trainingFlat,
   *   membershipDiscountedCount, trainingDiscountedCount
   * }
   */
  async getDiscountsByMonths(orgId, from, to) {
    const [membershipRows, trainingRows] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          EXTRACT(YEAR  FROM start_date)::int AS year,
          EXTRACT(MONTH FROM start_date)::int AS month,
          COALESCE(SUM(CASE WHEN offer_id IS NOT NULL THEN discount_amount ELSE 0 END), 0) AS offer_total,
          COALESCE(SUM(CASE WHEN offer_id IS NULL     THEN discount_amount ELSE 0 END), 0) AS flat_total,
          COUNT(*)::int AS discounted_count
        FROM memberships
        WHERE org_id         = ${orgId}
          AND discount_amount > 0
          AND start_date     >= ${from}
          AND start_date     <= ${to}
        GROUP BY year, month
      `,
      prisma.$queryRaw`
        SELECT
          EXTRACT(YEAR  FROM start_date)::int AS year,
          EXTRACT(MONTH FROM start_date)::int AS month,
          COALESCE(SUM(CASE WHEN offer_id IS NOT NULL THEN discount_amount ELSE 0 END), 0) AS offer_total,
          COALESCE(SUM(CASE WHEN offer_id IS NULL     THEN discount_amount ELSE 0 END), 0) AS flat_total,
          COUNT(*)::int AS discounted_count
        FROM trainings
        WHERE org_id         = ${orgId}
          AND discount_amount > 0
          AND start_date     >= ${from}
          AND start_date     <= ${to}
        GROUP BY year, month
      `,
    ]);

    const map = new Map();
    const ensure = (key) => {
      if (!map.has(key)) {
        map.set(key, {
          membershipOffer: 0,
          membershipFlat: 0,
          trainingOffer: 0,
          trainingFlat: 0,
          membershipDiscountedCount: 0,
          trainingDiscountedCount: 0,
        });
      }
      return map.get(key);
    };

    for (const r of membershipRows) {
      const entry = ensure(`${r.year}-${r.month}`);
      entry.membershipOffer = Number(r.offer_total);
      entry.membershipFlat = Number(r.flat_total);
      entry.membershipDiscountedCount = Number(r.discounted_count);
    }
    for (const r of trainingRows) {
      const entry = ensure(`${r.year}-${r.month}`);
      entry.trainingOffer = Number(r.offer_total);
      entry.trainingFlat = Number(r.flat_total);
      entry.trainingDiscountedCount = Number(r.discounted_count);
    }
    return map;
  }

  /**
   * Total membership + training sales count in the window — denominator for discount rate.
   * Uses the existing (org_id, status) / default indexes; two cheap COUNT queries.
   */
  async getSalesCounts(orgId, from, to) {
    const [membershipCount, trainingCount] = await Promise.all([
      prisma.membership.count({
        where: { orgId, startDate: { gte: from, lte: to } },
      }),
      prisma.training.count({
        where: { orgId, startDate: { gte: from, lte: to } },
      }),
    ]);
    return { membershipCount, trainingCount };
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
