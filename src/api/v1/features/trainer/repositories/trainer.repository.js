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
}

module.exports = new TrainerRepository();
