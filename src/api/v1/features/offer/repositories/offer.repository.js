const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

class OfferRepository extends CrudRepository {
  constructor() {
    super(prisma.offer);
  }

  async findByOrganization(orgId, filters = {}) {
    const where = { orgId };
    if (filters.type) where.type = filters.type;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return await this.find(where, {
      orderBy: { createdAt: "desc" },
    });
  }

  async findByIdOrThrow(id) {
    const offer = await this.get(id);
    if (!offer) throw createError("Offer not found", 404);
    return offer;
  }
}

module.exports = new OfferRepository();
