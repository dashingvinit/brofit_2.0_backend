const paymentRepository = require("../../../../../shared/repositories/payment.repository");
const expenseRepository = require("../repositories/expense.repository");
const investmentRepository = require("../repositories/investment.repository");

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
  }

  /**
   * All-time ROI metrics.
   * Returns { totalInvested, totalRevenue, totalExpenses, totalNetProfit, roiPercent, paybackMonths }.
   */
  async getRoi(orgId) {
    const now = new Date();
    const epoch = new Date(0);

    const [totalInvested, totalRevenue, totalExpenses, earliestInvestmentDate] =
      await Promise.all([
        investmentRepository.totalInvested(orgId, now),
        paymentRepository.sumInRange(orgId, epoch, now),
        expenseRepository.sumInRange(orgId, epoch, now),
        investmentRepository.getEarliestDate(orgId),
      ]);

    const totalNetProfit = totalRevenue - totalExpenses;

    let paybackMonths = null;
    if (totalInvested > 0 && earliestInvestmentDate) {
      const monthsElapsed = Math.max(
        1,
        (now.getFullYear() - earliestInvestmentDate.getFullYear()) * 12 +
          (now.getMonth() - earliestInvestmentDate.getMonth()),
      );
      const avgMonthlyNet = totalNetProfit / monthsElapsed;
      paybackMonths = avgMonthlyNet > 0 ? Math.ceil(totalInvested / avgMonthlyNet) : null;
    }

    const roiPercent =
      totalInvested > 0 ? (totalNetProfit / totalInvested) * 100 : null;

    return {
      totalInvested,
      totalRevenue,
      totalExpenses,
      totalNetProfit,
      roiPercent: roiPercent !== null ? Math.round(roiPercent * 100) / 100 : null,
      paybackMonths,
    };
  }

  /**
   * Monthly revenue + expense trend for the last N months.
   * Returns array of { year, month, revenue, expenses, netProfit }.
   * Uses 2 DB queries total instead of N×2.
   */
  async getTrends(orgId, months = 12) {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const [revenueMap, expenseMap] = await Promise.all([
      paymentRepository.revenueByMonths(orgId, from, to),
      expenseRepository.sumByMonths(orgId, from, to),
    ]);

    return Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const year = d.getFullYear();
      const month = d.getMonth() + 1; // 1-indexed
      const key = `${year}-${month}`;
      const revenue = revenueMap.get(key) || 0;
      const expenses = expenseMap.get(key) || 0;
      return { year, month, revenue, expenses, netProfit: revenue - expenses };
    });
  }
}

module.exports = new FinancialsAnalyticsService();
