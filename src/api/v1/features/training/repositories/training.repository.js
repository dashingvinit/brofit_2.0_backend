const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class TrainingRepository extends CrudRepository {
  constructor() {
    super(prisma.training);
  }

  async findByMember(memberId, options = {}) {
    return await this.find(
      { memberId },
      {
        orderBy: { createdAt: "desc" },
        include: { planVariant: { include: { planType: true } }, trainer: true, payments: true },
        ...options,
      },
    );
  }

  async findByOrganization(orgId, page = 1, limit = 10, filters = {}) {
    const where = { orgId };

    if (filters.status) where.status = filters.status;
    if (filters.memberId) where.memberId = filters.memberId;
    if (filters.trainerId) where.trainerId = filters.trainerId;

    return await this.findWithPagination(where, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        member: true,
        planVariant: { include: { planType: true } },
        trainer: true,
        payments: true,
      },
    });
  }

  async findByIdWithDetails(id) {
    return await this.model.findUnique({
      where: { id },
      include: {
        member: true,
        planVariant: { include: { planType: true } },
        trainer: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async findActiveTraining(memberId, orgId) {
    return await this.findOne(
      {
        memberId,
        orgId,
        status: "active",
      },
      {
        include: {
          planVariant: { include: { planType: true } },
          trainer: true,
          payments: true,
        },
      },
    );
  }

  async findExpiringTrainings(orgId, daysAhead = 7) {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return await this.find(
      {
        orgId,
        status: "active",
        endDate: { gte: now, lte: futureDate },
      },
      {
        orderBy: { endDate: "asc" },
        include: { member: true, planVariant: { include: { planType: true } }, trainer: true },
      },
    );
  }

  async getTrainingStats(orgId) {
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    const startOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));

    const [total, active, expired, cancelled, newThisMonth] =
      await Promise.all([
        this.count({ orgId }),
        this.count({ orgId, status: "active" }),
        this.count({ orgId, status: "expired" }),
        this.count({ orgId, status: "cancelled" }),
        this.count({
          orgId,
          createdAt: { gte: startOfMonth },
        }),
      ]);

    return { total, active, expired, cancelled, newThisMonth };
  }
}

module.exports = new TrainingRepository();
