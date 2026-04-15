const paymentRepository = require("../../../../../shared/repositories/payment.repository");
const expenseRepository = require("../repositories/expense.repository");
const investmentRepository = require("../repositories/investment.repository");
const cache = require("../../../../../shared/helpers/cache.helper");

class FinancialsAnalyticsService {
  /**
   * Revenue = sum of paid payments in [from, to].
   */
  async getRevenue(orgId, from, to) {
    return paymentRepository.sumInRange(orgId, from, to);
  }

  /**
   * Monthly P&L summary for a given month ("YYYY-MM").
   * Returns { period, from, to, revenue, expenses, netProfit }.
   */
  async getMonthlySummary(orgId, month) {
    return cache.get(`financials:summary:${orgId}:${month || "current"}`, cache.TTL.FIVE_MIN, async () => {
      let from, to;
      if (month) {
        const [year, mon] = month.split("-").map(Number);
        from = new Date(year, mon - 1, 1);
        to = new Date(year, mon, 0, 23, 59, 59, 999);
      } else {
        const now = new Date();
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      const [revenue, expenses] = await Promise.all([
        paymentRepository.sumInRange(orgId, from, to),
        expenseRepository.sumInRange(orgId, from, to),
      ]);

      return {
        period: month || `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
        from,
        to,
        revenue,
        expenses,
        netProfit: revenue - expenses,
      };
    });
  }

  /**
   * Current month summary plus comparison points: previous month and
   * same month last year. The frontend picks YoY when available, otherwise
   * falls back to MoM, otherwise shows no delta (brand-new gyms).
   */
  async getMonthlySummaryWithDelta(orgId) {
    return cache.get(`financials:summary-delta:${orgId}`, cache.TTL.FIVE_MIN, async () => {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();

      const ranges = {
        thisMonth: [new Date(y, m, 1), new Date(y, m + 1, 0, 23, 59, 59, 999)],
        lastMonth: [new Date(y, m - 1, 1), new Date(y, m, 0, 23, 59, 59, 999)],
        yearAgo:   [new Date(y - 1, m, 1), new Date(y - 1, m + 1, 0, 23, 59, 59, 999)],
      };

      const computeNet = async ([from, to]) => {
        const [revenue, expenses] = await Promise.all([
          paymentRepository.sumInRange(orgId, from, to),
          expenseRepository.sumInRange(orgId, from, to),
        ]);
        return { from, to, revenue, expenses, netProfit: revenue - expenses };
      };

      const earliestRevenueDate = await paymentRepository.getEarliestRevenueDate(orgId);
      const hasYearOfHistory =
        earliestRevenueDate && earliestRevenueDate <= ranges.yearAgo[1];
      const hasLastMonth =
        earliestRevenueDate && earliestRevenueDate <= ranges.lastMonth[1];

      const [thisMonth, lastMonth, yearAgo] = await Promise.all([
        computeNet(ranges.thisMonth),
        hasLastMonth ? computeNet(ranges.lastMonth) : Promise.resolve(null),
        hasYearOfHistory ? computeNet(ranges.yearAgo) : Promise.resolve(null),
      ]);

      return {
        period: `${y}-${String(m + 1).padStart(2, "0")}`,
        thisMonth,
        lastMonth,
        sameMonthLastYear: yearAgo,
      };
    });
  }

  /**
   * All-time ROI metrics.
   * Returns { totalInvested, totalRevenue, totalExpenses, totalNetProfit, roiPercent, paybackMonths }.
   */
  async getRoi(orgId) {
    return cache.get(`financials:roi:${orgId}`, cache.TTL.TEN_MIN, async () => {
      const now = new Date();
      const epoch = new Date(0);

      const [totalInvested, totalRevenue, totalExpenses, operationalStartDate] =
        await Promise.all([
          investmentRepository.totalInvested(orgId, now),
          paymentRepository.sumInRange(orgId, epoch, now),
          expenseRepository.sumInRange(orgId, epoch, now),
          paymentRepository.getEarliestRevenueDate(orgId),
        ]);

      const totalNetProfit = totalRevenue - totalExpenses;

      // Use exact days since first revenue to measure operational period
      let paybackMonths = null;
      let projectedAnnualRoi = null;
      if (totalInvested > 0 && operationalStartDate) {
        const daysElapsed = Math.max(
          1,
          (now - operationalStartDate) / (1000 * 60 * 60 * 24),
        );
        const monthsElapsed = daysElapsed / 30.44; // avg days per month
        const avgMonthlyNet = totalNetProfit / monthsElapsed;

        // Payback: how many months at current avg monthly net to recover investment
        paybackMonths = avgMonthlyNet > 0 ? Math.ceil(totalInvested / avgMonthlyNet) : null;

        // Projected Annual ROI: annualise the current net profit rate
        const annualNetProfit = avgMonthlyNet * 12;
        projectedAnnualRoi = Math.round((annualNetProfit / totalInvested) * 100 * 100) / 100;
      }

      return {
        totalInvested,
        totalRevenue,
        totalExpenses,
        totalNetProfit,
        roiPercent: projectedAnnualRoi,
        paybackMonths,
      };
    });
  }

  /**
   * Monthly revenue + expense trend for the last N months.
   * Returns array of { year, month, revenue, expenses, netProfit }.
   * Uses 2 DB queries total instead of N×2.
   */
  async getTrends(orgId, months = 12) {
    return cache.get(`financials:trends:${orgId}:${months}`, cache.TTL.TEN_MIN, async () => {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const [revenueMap, expenseMap] = await Promise.all([
        paymentRepository.revenueByMonths(orgId, from, to),
        expenseRepository.sumByMonths(orgId, from, to),
      ]);

      const allKeys = new Set([...revenueMap.keys(), ...expenseMap.keys()]);
      return [...allKeys]
        .map((key) => {
          const [year, month] = key.split("-").map(Number);
          const revenue = revenueMap.get(key) || 0;
          const expenses = expenseMap.get(key) || 0;
          return { year, month, revenue, expenses, netProfit: revenue - expenses };
        })
        .sort((a, b) => a.year - b.year || a.month - b.month);
    });
  }
}

module.exports = new FinancialsAnalyticsService();
