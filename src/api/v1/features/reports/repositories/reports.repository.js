const { Prisma } = require("@prisma/client");
const { prisma } = require("../../../../../config/prisma.config");
const { countActiveMembers, startOfDay } = require("../../../../../shared/helpers/subscription.helper");

class ReportsRepository {
  /**
   * Get all organization IDs (used by the cron job to iterate orgs).
   */
  async getAllOrgIds() {
    const orgs = await prisma.organization.findMany({ select: { id: true } });
    return orgs.map((o) => o.id);
  }

  /**
   * Count total, active, and inactive members for an org.
   * Active = isActive=true AND has at least one active membership or training.
   * Inactive = isActive=true AND no active membership or training.
   */
  async getMemberCounts(orgId) {
    const [total, active, inactive] = await Promise.all([
      prisma.member.count({ where: { orgId } }),
      countActiveMembers(orgId),
      prisma.member.count({
        where: {
          orgId,
          isActive: true,
          memberships: { none: { status: "active" } },
          trainings: { none: { status: "active" } },
        },
      }),
    ]);
    return { total, active, inactive };
  }

  /**
   * Upsert a daily activity snapshot for the given org and date.
   */
  async upsertDailySnapshot({ orgId, snapshotDate, totalMembers, activeMembers, inactiveMembers, newlyExpired }) {
    return prisma.dailyActivitySnapshot.upsert({
      where: { orgId_snapshotDate: { orgId, snapshotDate } },
      create: { orgId, snapshotDate, totalMembers, activeMembers, inactiveMembers, newlyExpired },
      update: { totalMembers, activeMembers, inactiveMembers, newlyExpired },
    });
  }

  /**
   * Get daily activity snapshots for an org over the last N days.
   */
  async getActivityTrend(orgId, days = 30) {
    const since = startOfDay();
    since.setDate(since.getDate() - days);

    return prisma.dailyActivitySnapshot.findMany({
      where: { orgId, snapshotDate: { gte: since } },
      orderBy: { snapshotDate: "asc" },
      select: {
        snapshotDate: true,
        totalMembers: true,
        activeMembers: true,
        inactiveMembers: true,
        newlyExpired: true,
      },
    });
  }


  /**
   * Bulk-expire memberships where endDate has passed and status is still "active".
   * Returns the expired records (id, memberId, planVariantId, endDate, autoRenew, notes).
   */
  async expireStaleMemberships(orgId) {
    const endOfYesterday = new Date();
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23, 59, 59, 999);

    const stale = await prisma.membership.findMany({
      where: { orgId, status: "active", endDate: { lt: endOfYesterday } },
      select: { id: true, memberId: true, planVariantId: true, endDate: true, autoRenew: true, notes: true },
    });

    if (stale.length > 0) {
      await prisma.membership.updateMany({
        where: { id: { in: stale.map((m) => m.id) } },
        data: { status: "expired" },
      });
    }

    return stale;
  }

  /**
   * Bulk-expire trainings where endDate has passed and status is still "active".
   * Returns the expired records (id, memberId, planVariantId, trainerId, endDate, autoRenew, notes).
   */
  async expireStaleTrainings(orgId) {
    const endOfYesterday = new Date();
    endOfYesterday.setDate(endOfYesterday.getDate() - 1);
    endOfYesterday.setHours(23, 59, 59, 999);

    const stale = await prisma.training.findMany({
      where: { orgId, status: "active", endDate: { lt: endOfYesterday } },
      select: { id: true, memberId: true, planVariantId: true, trainerId: true, endDate: true, autoRenew: true, notes: true },
    });

    if (stale.length > 0) {
      await prisma.training.updateMany({
        where: { id: { in: stale.map((t) => t.id) } },
        data: { status: "expired" },
      });
    }

    return stale;
  }

  /**
   * Auto-renew expired memberships and trainings that have autoRenew=true.
   * New subscription starts from the old endDate, priced at the current plan variant price.
   * No payment is recorded — dues will appear for the gym to collect.
   * Returns counts of renewed memberships and trainings.
   */
  async renewAutoRenewSubscriptions(orgId, expiredMemberships, expiredTrainings) {
    const toRenewMemberships = expiredMemberships.filter((m) => m.autoRenew);
    const toRenewTrainings = expiredTrainings.filter((t) => t.autoRenew);

    if (toRenewMemberships.length === 0 && toRenewTrainings.length === 0) {
      return { renewedMemberships: 0, renewedTrainings: 0 };
    }

    // Fetch all unique plan variants needed
    const allVariantIds = [
      ...new Set([
        ...toRenewMemberships.map((m) => m.planVariantId),
        ...toRenewTrainings.map((t) => t.planVariantId),
      ]),
    ];
    const variants = await prisma.planVariant.findMany({
      where: { id: { in: allVariantIds }, isActive: true },
      select: { id: true, price: true, durationDays: true },
    });
    const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));

    let renewedMemberships = 0;
    let renewedTrainings = 0;

    await prisma.$transaction(async (tx) => {
      for (const m of toRenewMemberships) {
        const variant = variantMap[m.planVariantId];
        if (!variant) continue; // skip if plan variant was deactivated

        const startDate = new Date(m.endDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + variant.durationDays);

        await tx.membership.create({
          data: {
            orgId,
            memberId: m.memberId,
            planVariantId: m.planVariantId,
            startDate,
            endDate,
            status: "active",
            priceAtPurchase: variant.price,
            discountAmount: 0,
            finalPrice: variant.price,
            autoRenew: true,
            notes: m.notes || null,
          },
        });
        renewedMemberships++;
      }

      for (const t of toRenewTrainings) {
        const variant = variantMap[t.planVariantId];
        if (!variant) continue;

        const startDate = new Date(t.endDate);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + variant.durationDays);

        await tx.training.create({
          data: {
            orgId,
            memberId: t.memberId,
            planVariantId: t.planVariantId,
            trainerId: t.trainerId || null,
            startDate,
            endDate,
            status: "active",
            priceAtPurchase: variant.price,
            discountAmount: 0,
            finalPrice: variant.price,
            autoRenew: true,
            notes: t.notes || null,
          },
        });
        renewedTrainings++;
      }
    });

    return { renewedMemberships, renewedTrainings };
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
   * Dues are computed at the DB level to avoid loading all records into memory.
   * Optionally filter by a specific memberId.
   */
  async getMembersWithDues(orgId, page = 1, limit = 10, filters = {}) {
    const skip = (page - 1) * limit;
    const memberFilter = filters.memberId
      ? Prisma.sql`AND m.id = ${filters.memberId}`
      : Prisma.empty;

    // Step 1: compute per-member dues totals in SQL, filter to those with dues > 0
    const dueRows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        m.id                AS "memberId",
        m.first_name        AS "firstName",
        m.last_name         AS "lastName",
        m.phone,
        m.email,
        m.is_active         AS "isActive",
        COALESCE(ms_dues.total, 0)  AS "membershipDuesTotal",
        COALESCE(tr_dues.total, 0)  AS "trainingDuesTotal",
        COALESCE(ms_dues.total, 0) + COALESCE(tr_dues.total, 0) AS "totalDue"
      FROM members m
      LEFT JOIN (
        SELECT ms.member_id,
               SUM(GREATEST(ms.final_price - COALESCE(p.paid, 0), 0)) AS total
        FROM memberships ms
        LEFT JOIN (
          SELECT membership_id, SUM(amount) AS paid
          FROM payments
          WHERE status = 'paid'
          GROUP BY membership_id
        ) p ON p.membership_id = ms.id
        WHERE ms.org_id = ${orgId}
        GROUP BY ms.member_id
        HAVING SUM(GREATEST(ms.final_price - COALESCE(p.paid, 0), 0)) > 0
      ) ms_dues ON ms_dues.member_id = m.id
      LEFT JOIN (
        SELECT tr.member_id,
               SUM(GREATEST(tr.final_price - COALESCE(p.paid, 0), 0)) AS total
        FROM trainings tr
        LEFT JOIN (
          SELECT training_id, SUM(amount) AS paid
          FROM payments
          WHERE status = 'paid'
          GROUP BY training_id
        ) p ON p.training_id = tr.id
        WHERE tr.org_id = ${orgId}
        GROUP BY tr.member_id
        HAVING SUM(GREATEST(tr.final_price - COALESCE(p.paid, 0), 0)) > 0
      ) tr_dues ON tr_dues.member_id = m.id
      WHERE m.org_id = ${orgId}
        ${memberFilter}
        AND (COALESCE(ms_dues.total, 0) + COALESCE(tr_dues.total, 0)) > 0
      ORDER BY "totalDue" DESC
    `);

    const total = dueRows.length;
    const grandTotal = dueRows.reduce((sum, r) => sum + Number(r.totalDue), 0);
    const pageRows = dueRows.slice(skip, skip + limit);
    const pagination = {
      page, limit, total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };

    if (pageRows.length === 0) {
      return { data: [], summary: { totalMembersWithDues: total, grandTotal }, pagination };
    }

    // Step 2: fetch detailed dues breakdown only for the current page of members
    const memberIds = pageRows.map((r) => r.memberId);

    const [memberships, trainings] = await Promise.all([
      prisma.membership.findMany({
        where: { orgId, memberId: { in: memberIds } },
        include: {
          payments: { where: { status: "paid" }, select: { amount: true } },
          planVariant: { select: { durationLabel: true, planType: { select: { name: true } } } },
        },
      }),
      prisma.training.findMany({
        where: { orgId, memberId: { in: memberIds } },
        include: {
          payments: { where: { status: "paid" }, select: { amount: true } },
          planVariant: { select: { durationLabel: true, planType: { select: { name: true } } } },
        },
      }),
    ]);

    // Index by memberId for O(1) lookup
    const msMap = {};
    for (const ms of memberships) {
      (msMap[ms.memberId] ||= []).push(ms);
    }
    const trMap = {};
    for (const tr of trainings) {
      (trMap[tr.memberId] ||= []).push(tr);
    }

    const data = pageRows.map((row) => {
      const membershipDues = [];
      let membershipDuesTotal = 0;
      for (const ms of msMap[row.memberId] || []) {
        const paid = ms.payments.reduce((s, p) => s + p.amount, 0);
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
      let trainingDuesTotal = 0;
      for (const tr of trMap[row.memberId] || []) {
        const paid = tr.payments.reduce((s, p) => s + p.amount, 0);
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

      return {
        memberId: row.memberId,
        firstName: row.firstName,
        lastName: row.lastName,
        phone: row.phone,
        email: row.email,
        isActive: row.isActive,
        totalDue: Number(row.totalDue),
        membershipDuesTotal,
        trainingDuesTotal,
        membershipDues,
        trainingDues,
      };
    });

    return { data, summary: { totalMembersWithDues: total, grandTotal }, pagination };
  }
}

module.exports = new ReportsRepository();
