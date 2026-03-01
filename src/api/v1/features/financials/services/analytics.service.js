const { prisma } = require("../../../../../config/prisma.config");
const expenseRepository = require("../repositories/expense.repository");
const investmentRepository = require("../repositories/investment.repository");

class AnalyticsService {
  /**
   * Revenue = sum of paid payments in [from, to].
   */
  async getRevenue(orgId, from, to) {
    const result = await prisma.payment.aggregate({
      where: {
        orgId,
        status: "paid",
        paidAt: { gte: from, lte: to },
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  /**
   * Monthly P&L summary for a given month ("YYYY-MM") or full year ("YYYY").
   * Returns { revenue, expenses, netProfit, month? }.
   */
  async getMonthlySummary(orgId, month) {
    let from, to;
    if (month) {
      const [year, mon] = month.split("-").map(Number);
      from = new Date(year, mon - 1, 1);
      to = new Date(year, mon, 0, 23, 59, 59, 999);
    } else {
      // Default: current month
      const now = new Date();
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    const [revenue, expenses] = await Promise.all([
      this.getRevenue(orgId, from, to),
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
    const epoch = new Date(0); // safe all-time floor

    const [totalInvested, totalRevenue, totalExpenses, earliestInvestmentDate] =
      await Promise.all([
        investmentRepository.totalInvested(orgId, now),
        this.getRevenue(orgId, epoch, now),
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
   * Returns array of { year, month, label, revenue, expenses, netProfit }.
   * All months are queried concurrently.
   */
  async getTrends(orgId, months = 12) {
    const now = new Date();

    const monthRanges = Array.from({ length: months }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1 - i), 1);
      const year = d.getFullYear();
      const month = d.getMonth(); // 0-indexed
      return {
        year,
        month,
        from: new Date(year, month, 1),
        to: new Date(year, month + 1, 0, 23, 59, 59, 999),
      };
    });

    return Promise.all(
      monthRanges.map(async ({ year, month, from, to }) => {
        const [revenue, expenses] = await Promise.all([
          this.getRevenue(orgId, from, to),
          expenseRepository.sumInRange(orgId, from, to),
        ]);
        return {
          year,
          month: month + 1, // 1-indexed for the client
          revenue,
          expenses,
          netProfit: revenue - expenses,
        };
      }),
    );
  }
}

module.exports = new AnalyticsService();
