const { prisma } = require("../../../../../config/prisma.config");

class InvestmentRepository {
  async create(data) {
    return prisma.investment.create({ data });
  }

  async findMany(orgId) {
    return prisma.investment.findMany({
      where: { orgId },
      orderBy: { date: "desc" },
    });
  }

  async findOne(id, orgId) {
    return prisma.investment.findFirst({ where: { id, orgId } });
  }

  async update(id, orgId, data) {
    return prisma.investment.updateMany({ where: { id, orgId }, data });
  }

  async delete(id, orgId) {
    return prisma.investment.deleteMany({ where: { id, orgId } });
  }

  /**
   * Sum all investments up to (and including) a given date.
   */
  async totalInvested(orgId, upTo) {
    const where = { orgId };
    if (upTo) where.date = { lte: upTo };
    const result = await prisma.investment.aggregate({
      where,
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  /**
   * Date of the earliest investment for an org. Returns null if none exist.
   */
  async getEarliestDate(orgId) {
    const row = await prisma.investment.findFirst({
      where: { orgId },
      orderBy: { date: "asc" },
      select: { date: true },
    });
    return row?.date || null;
  }
}

module.exports = new InvestmentRepository();
