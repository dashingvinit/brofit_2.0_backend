const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { getStartOfCurrentMonth, startOfDay } = require("../../../../../shared/helpers/subscription.helper");

const MEMBER_SELECT = {
  id: true, firstName: true, lastName: true, phone: true, email: true,
};

const TRAINER_SELECT = {
  id: true, name: true,
};

const PLAN_VARIANT_INCLUDE = {
  select: {
    id: true, price: true, durationLabel: true, durationDays: true,
    planType: { select: { id: true, name: true, category: true } },
  },
};

const PAYMENT_SELECT = {
  select: { id: true, amount: true, method: true, status: true, paidAt: true, createdAt: true },
};

class TrainingRepository extends CrudRepository {
  constructor() {
    super(prisma.training);
  }

  async findByMember(memberId, options = {}) {
    return await this.find(
      { memberId },
      {
        orderBy: { createdAt: "desc" },
        include: {
          planVariant: PLAN_VARIANT_INCLUDE,
          trainer: { select: TRAINER_SELECT },
          payments: PAYMENT_SELECT,
        },
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
        member: { select: MEMBER_SELECT },
        planVariant: PLAN_VARIANT_INCLUDE,
        trainer: { select: TRAINER_SELECT },
        payments: PAYMENT_SELECT,
      },
    });
  }

  async findByIdWithDetails(id) {
    return await this.model.findUnique({
      where: { id },
      include: {
        member: { select: MEMBER_SELECT },
        planVariant: PLAN_VARIANT_INCLUDE,
        trainer: { select: TRAINER_SELECT },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
  }

  async findActiveTraining(memberId, orgId) {
    return await this.findOne(
      { memberId, orgId, status: "active" },
      {
        include: {
          planVariant: PLAN_VARIANT_INCLUDE,
          trainer: { select: TRAINER_SELECT },
          payments: PAYMENT_SELECT,
        },
      },
    );
  }

  async findExpiringTrainings(orgId, daysAhead = 7) {
    const now = startOfDay();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);
    futureDate.setHours(23, 59, 59, 999);

    return await this.find(
      {
        orgId,
        status: "active",
        endDate: { gte: now, lte: futureDate },
      },
      {
        orderBy: { endDate: "asc" },
        include: {
          member: { select: MEMBER_SELECT },
          planVariant: PLAN_VARIANT_INCLUDE,
          trainer: { select: TRAINER_SELECT },
        },
      },
    );
  }

  async getTrainingStats(orgId) {
    const startOfMonth = getStartOfCurrentMonth();

    const [total, active, expired, cancelled, newThisMonth] = await Promise.all([
      this.count({ orgId }),
      this.count({ orgId, status: "active" }),
      this.count({ orgId, status: "expired" }),
      this.count({ orgId, status: "cancelled" }),
      this.count({ orgId, createdAt: { gte: startOfMonth } }),
    ]);

    return { total, active, expired, cancelled, newThisMonth };
  }
}

module.exports = new TrainingRepository();
