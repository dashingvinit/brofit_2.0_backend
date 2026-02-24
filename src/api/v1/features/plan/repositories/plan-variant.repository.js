const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class PlanVariantRepository extends CrudRepository {
  constructor() {
    super(prisma.planVariant);
  }

  async findByPlanType(planTypeId, includeInactive = true) {
    const whereClause = {
      planTypeId,
    };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    return await this.find(whereClause, {
      orderBy: { durationDays: "asc" },
      include: {
        planType: true,
      },
    });
  }

  async findActiveByPlanType(planTypeId) {
    return await this.find(
      {
        planTypeId,
        isActive: true,
      },
      {
        orderBy: { durationDays: "asc" },
      }
    );
  }

  async findByIdWithPlanType(variantId) {
    return await this.model.findUnique({
      where: { id: variantId },
      include: {
        planType: true,
      },
    });
  }

  // Override destroy to use hardDelete since we want to actually delete variants
  async destroy(id) {
    return await this.hardDelete(id);
  }
}

module.exports = new PlanVariantRepository();
