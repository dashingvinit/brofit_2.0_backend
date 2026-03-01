const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");

class TrainerRepository extends CrudRepository {
  constructor() {
    super(prisma.trainer);
  }

  async findByOrganization(orgId) {
    return await this.find(
      { orgId, isActive: true },
      {
        orderBy: { name: "asc" },
        include: {
          _count: {
            select: {
              trainings: { where: { status: "active" } },
            },
          },
        },
      },
    );
  }

  async findWithActiveClients(trainerId) {
    return await this.get(trainerId, {
      include: {
        trainings: {
          where: { status: "active" },
          include: {
            member: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                phone: true,
                email: true,
                isActive: true,
              },
            },
            planVariant: {
              include: {
                planType: { select: { name: true } },
              },
            },
          },
          orderBy: { endDate: "asc" },
        },
      },
    });
  }
}

module.exports = new TrainerRepository();
