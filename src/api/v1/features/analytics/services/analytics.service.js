const analyticsRepository = require("../repositories/analytics.repository");
const { startOfDay } = require("../../../../../shared/helpers/subscription.helper");
const cache = require("../../../../../shared/helpers/cache.helper");

class AnalyticsService {
  // Returns top plans by sales count + revenue across memberships & trainings
  async getTopPlans(orgId, months) {
    return cache.get(`analytics:topPlans:${orgId}:${months}`, cache.TTL.TEN_MIN, async () => {
      const since = startOfDay(new Date());
      since.setMonth(since.getMonth() - months);
      since.setDate(1);

      const { membershipGroups, trainingGroups, variantMap } =
        await analyticsRepository.getTopPlans(orgId, since);

      const planMap = {};
      const allGroups = [
        ...membershipGroups.map((g) => ({ ...g, _category: "membership" })),
        ...trainingGroups.map((g) => ({ ...g, _category: "training" })),
      ];

      for (const g of allGroups) {
        const v = variantMap[g.planVariantId];
        const planName = v?.planType?.name || "Unknown";
        const category = v?.planType?.category || g._category;

        if (!planMap[planName]) {
          planMap[planName] = { planName, category, totalCount: 0, totalRevenue: 0, variants: [] };
        }

        planMap[planName].totalCount += g._count.id;
        planMap[planName].totalRevenue += g._sum.finalPrice || 0;
        planMap[planName].variants.push({
          planVariantId: g.planVariantId,
          durationLabel: v?.durationLabel || "—",
          count: g._count.id,
          revenue: Math.round((g._sum.finalPrice || 0) * 100) / 100,
        });
      }

      return Object.values(planMap)
        .sort((a, b) => b.totalCount - a.totalCount)
        .slice(0, 6)
        .map((p) => ({
          ...p,
          totalRevenue: Math.round(p.totalRevenue * 100) / 100,
          variants: p.variants.sort((a, b) => b.count - a.count),
        }));
    });
  }

  // Retention: repeat vs one-time vs churned
  async getRetention(orgId) {
    return cache.get(`analytics:retention:${orgId}`, cache.TTL.TEN_MIN, async () => {
      const { membershipCounts, activeNow, totalMembers } =
        await analyticsRepository.getRetention(orgId);

      let repeatCount = 0;
      let oneTimeCount = 0;
      for (const entry of membershipCounts) {
        if (entry._count.id > 1) repeatCount++;
        else oneTimeCount++;
      }

      const membersWithHistory = membershipCounts.length;
      const churnedCount = Math.max(0, membersWithHistory - activeNow);
      const retentionRate =
        membersWithHistory > 0
          ? Math.round((repeatCount / membersWithHistory) * 1000) / 10
          : 0;

      return { totalMembers, activeCount: activeNow, membersWithHistory, repeatCount, oneTimeCount, churnedCount, retentionRate };
    });
  }

  // Revenue split by membership vs training for each of the last N months.
  // Uses 2 DB queries total instead of N×2. Revenue is based on actual paidAt payments.
  async getRevenueBreakdown(orgId, months) {
    return cache.get(`analytics:revenueBreakdown:${orgId}:${months}`, cache.TTL.TEN_MIN, async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const categoryMap = await analyticsRepository.getRevenueByCategoryByMonths(orgId, from, to);

      return Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        const key = `${year}-${month}`;
        const { membership = 0, training = 0 } = categoryMap.get(key) || {};
        return { year, month, membership, training, total: membership + training };
      });
    });
  }

  // Payment method distribution with percentages
  async getPaymentMethods(orgId) {
    return cache.get(`analytics:paymentMethods:${orgId}`, cache.TTL.TEN_MIN, async () => {
      const groups = await analyticsRepository.getPaymentMethods(orgId);
      const total = groups.reduce((sum, g) => sum + (g._sum.amount || 0), 0);

      return groups.map((g) => ({
        method: g.method,
        count: g._count.id,
        amount: g._sum.amount || 0,
        percentage: total > 0 ? Math.round(((g._sum.amount || 0) / total) * 1000) / 10 : 0,
      }));
    });
  }

  // Per-trainer: active clients, total clients, revenue, avg plan price
  async getTrainerPerformance(orgId) {
    return cache.get(`analytics:trainerPerformance:${orgId}`, cache.TTL.TEN_MIN, async () => {
      const { trainers, trainingGroups, activeGroups } =
        await analyticsRepository.getTrainerPerformance(orgId);

      const totalMap = Object.fromEntries(trainingGroups.map((g) => [g.trainerId, g]));
      const activeMap = Object.fromEntries(activeGroups.map((g) => [g.trainerId, g._count.id]));

      return trainers
        .map((t) => {
          const total = totalMap[t.id];
          const totalCount = total?._count.id || 0;
          const totalRevenue = total?._sum.finalPrice || 0;
          return {
            trainerId: t.id,
            trainerName: t.name,
            activeClients: activeMap[t.id] || 0,
            totalClients: totalCount,
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            avgPlanPrice: totalCount > 0 ? Math.round((totalRevenue / totalCount) * 100) / 100 : 0,
          };
        })
        .sort((a, b) => b.totalRevenue - a.totalRevenue);
    });
  }

  // New members joined per month for the last N months.
  // Uses 1 DB query total instead of N.
  async getMemberGrowth(orgId, months) {
    return cache.get(`analytics:memberGrowth:${orgId}:${months}`, cache.TTL.TEN_MIN, async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const growthMap = await analyticsRepository.getNewMembersByMonths(orgId, from, to);

      return Array.from({ length: months }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
        const year = d.getFullYear();
        const month = d.getMonth() + 1;
        return { year, month, newMembers: growthMap.get(`${year}-${month}`) || 0 };
      });
    });
  }

  // Membership duration preference: which plan variant durations members pick most
  async getMembershipDurationPreference(orgId) {
    return cache.get(`analytics:durationPref:${orgId}`, cache.TTL.TEN_MIN, async () => {
      const { groups, variants } = await analyticsRepository.getMembershipDurationPreference(orgId);

      const variantMap = Object.fromEntries(variants.map((v) => [v.id, v]));
      const total = groups.reduce((sum, g) => sum + g._count.id, 0);

      const durationMap = {};
      for (const g of groups) {
        const v = variantMap[g.planVariantId];
        const label = v?.durationLabel || "Unknown";
        const days = v?.durationDays ?? 0;
        if (!durationMap[label]) {
          durationMap[label] = { durationLabel: label, durationDays: days, count: 0 };
        }
        durationMap[label].count += g._count.id;
      }

      const buckets = Object.values(durationMap)
        .sort((a, b) => b.count - a.count)
        .map((d) => ({
          ...d,
          percentage: total > 0 ? Math.round((d.count / total) * 1000) / 10 : 0,
        }));

      const weightedDays =
        total > 0 ? buckets.reduce((sum, d) => sum + d.durationDays * d.count, 0) / total : 0;
      const avgMonths = Math.round((weightedDays / 30) * 10) / 10;

      return { avgMonths, buckets };
    });
  }

  // Gender + age bracket distribution
  async getDemographics(orgId) {
    return cache.get(`analytics:demographics:${orgId}`, cache.TTL.TEN_MIN, async () => {
      const members = await analyticsRepository.getDemographics(orgId);

      const genderMap = {};
      for (const m of members) {
        const g = m.gender || "Not specified";
        genderMap[g] = (genderMap[g] || 0) + 1;
      }
      const gender = Object.entries(genderMap).map(([label, count]) => ({
        label,
        count,
        percentage: members.length > 0 ? Math.round((count / members.length) * 1000) / 10 : 0,
      }));

      const now = new Date();
      const brackets = { "< 18": 0, "18–25": 0, "26–35": 0, "36–45": 0, "46–55": 0, "55+": 0 };
      for (const m of members) {
        if (!m.dateOfBirth) continue;
        const age = Math.floor((now - new Date(m.dateOfBirth)) / (365.25 * 24 * 3600 * 1000));
        if (age < 18) brackets["< 18"]++;
        else if (age <= 25) brackets["18–25"]++;
        else if (age <= 35) brackets["26–35"]++;
        else if (age <= 45) brackets["36–45"]++;
        else if (age <= 55) brackets["46–55"]++;
        else brackets["55+"]++;
      }
      const ageBrackets = Object.entries(brackets).map(([label, count]) => ({
        label,
        count,
        percentage: members.length > 0 ? Math.round((count / members.length) * 1000) / 10 : 0,
      }));

      return { gender, ageBrackets, totalMembers: members.length };
    });
  }
}

module.exports = new AnalyticsService();
