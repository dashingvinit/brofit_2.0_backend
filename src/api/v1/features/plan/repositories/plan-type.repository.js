const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class PlanTypeRepository extends CrudRepository {
  constructor() {
    super(prisma.planType);
  }

  async findByOrganization(organizationId, includeInactive = true) {
    const whereClause = {
      orgId: organizationId,
    };

    if (!includeInactive) {
      whereClause.isActive = true;
    }

    return await this.find(whereClause, {
      orderBy: { createdAt: "desc" },
      include: {
        variants: {
          where: includeInactive ? {} : { isActive: true },
          orderBy: { durationDays: "asc" },
        },
      },
    });
  }

  async findByIdWithVariants(planTypeId, includeInactive = true) {
    const whereClause = includeInactive
      ? {}
      : { isActive: true };

    return await this.model.findUnique({
      where: { id: planTypeId },
      include: {
        variants: {
          where: whereClause,
          orderBy: { durationDays: "asc" },
        },
      },
    });
  }

  async findByNameAndOrg(name, organizationId) {
    return await this.findOne({
      name,
      orgId: organizationId,
    });
  }

  async findActiveByOrganization(organizationId) {
    return await this.find(
      {
        orgId: organizationId,
        isActive: true,
      },
      {
        orderBy: { createdAt: "desc" },
        include: {
          variants: {
            where: { isActive: true },
            orderBy: { durationDays: "asc" },
          },
        },
      }
    );
  }
}

module.exports = new PlanTypeRepository();
