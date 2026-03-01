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
}

module.exports = new ExpenseRepository();
