const { prisma } = require("../../../../../config/prisma.config");

class ExpenseRepository {
  async create(data) {
    return prisma.expense.create({ data });
  }

  async findMany(orgId, { from, to } = {}) {
    const where = { orgId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = from;
      if (to) where.date.lte = to;
    }
    return prisma.expense.findMany({
      where,
      orderBy: { date: "desc" },
    });
  }

  async findOne(id, orgId) {
    return prisma.expense.findFirst({ where: { id, orgId } });
  }

  async update(id, orgId, data) {
    return prisma.expense.updateMany({ where: { id, orgId }, data });
  }

  async delete(id, orgId) {
    return prisma.expense.deleteMany({ where: { id, orgId } });
  }

  /**
   * Sum all expenses in a date range.
   */
  async sumInRange(orgId, from, to) {
    const result = await prisma.expense.aggregate({
      where: { orgId, date: { gte: from, lte: to } },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  /**
   * Sum expenses grouped by year+month for a date range.
   * Returns a Map keyed by "YYYY-M" -> total amount.
   * Single query replacing N per-month sumInRange calls.
   */
  async sumByMonths(orgId, from, to) {
    const rows = await prisma.$queryRaw`
      SELECT
        EXTRACT(YEAR  FROM date)::int AS year,
        EXTRACT(MONTH FROM date)::int AS month,
        COALESCE(SUM(amount), 0)      AS total
      FROM expenses
      WHERE org_id = ${orgId}
        AND date >= ${from}
        AND date <= ${to}
      GROUP BY year, month
    `;
    const map = new Map();
    for (const r of rows) {
      map.set(`${r.year}-${r.month}`, Number(r.total));
    }
    return map;
  }
}

module.exports = new ExpenseRepository();
