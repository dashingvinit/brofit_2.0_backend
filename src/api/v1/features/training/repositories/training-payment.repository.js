const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class TrainingPaymentRepository extends CrudRepository {
  constructor() {
    super(prisma.payment);
  }

  async findByTraining(trainingId) {
    return await this.find(
      { trainingId },
      {
        orderBy: { createdAt: "desc" },
      },
    );
  }

  async findByMember(memberId, page = 1, limit = 10) {
    return await this.findWithPagination(
      { memberId, trainingId: { not: null } },
      {
        page,
        limit,
        orderBy: { createdAt: "desc" },
        include: { training: { include: { planVariant: { include: { planType: true } } } } },
      },
    );
  }

  async findByOrganization(orgId, page = 1, limit = 10, filters = {}) {
    const where = { orgId, trainingId: { not: null } };

    if (filters.status) where.status = filters.status;
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.trainingId) where.trainingId = filters.trainingId;
    if (filters.method) where.method = filters.method;

    return await this.findWithPagination(where, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        member: true,
        training: { include: { planVariant: { include: { planType: true } } } },
      },
    });
  }

  async getPaidAmountForTraining(trainingId) {
    const result = await prisma.payment.aggregate({
      where: {
        trainingId,
        status: "paid",
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  async getPaymentStats(orgId) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalCollected, collectedThisMonth] = await Promise.all([
      prisma.payment.aggregate({
        where: { orgId, status: "paid", trainingId: { not: null } },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          orgId,
          status: "paid",
          trainingId: { not: null },
          paidAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCollected: totalCollected._sum.amount || 0,
      collectedThisMonth: collectedThisMonth._sum.amount || 0,
    };
  }
}

module.exports = new TrainingPaymentRepository();
