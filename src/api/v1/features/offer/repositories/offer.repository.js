const CrudRepository = require("../../../../../shared/repositories/crud.repository");
const { prisma } = require("../../../../../config/prisma.config");
const { createError } = require("../../../../../shared/helpers/subscription.helper");

const VARIANT_SELECT = {
  id: true,
  price: true,
  durationLabel: true,
  durationDays: true,
  planType: { select: { id: true, name: true, category: true } },
};

class OfferRepository extends CrudRepository {
  constructor() {
    super(prisma.offer);
  }

  async findByOrganization(orgId, filters = {}, page = 1, limit = 20) {
    const where = { orgId };
    if (filters.type) where.type = filters.type;
    if (filters.isActive !== undefined) where.isActive = filters.isActive;

    return await this.findWithPagination(where, {
      page,
      limit,
      orderBy: { createdAt: "desc" },
      include: {
        membershipPlanVariant: { select: VARIANT_SELECT },
        trainingPlanVariant: { select: VARIANT_SELECT },
        _count: { select: { memberships: true, trainings: true } },
      },
    });
  }

  async findByIdOrThrow(id) {
    const offer = await this.model.findUnique({
      where: { id },
      include: {
        membershipPlanVariant: { select: VARIANT_SELECT },
        trainingPlanVariant: { select: VARIANT_SELECT },
        _count: { select: { memberships: true, trainings: true } },
      },
    });
    if (!offer) throw createError("Offer not found", 404);
    return offer;
  }

  async getOfferStats(id, orgId) {
    const [memberships, trainings] = await Promise.all([
      prisma.membership.aggregate({
        where: { offerId: id, orgId },
        _count: true,
        _sum: { finalPrice: true, discountAmount: true },
      }),
      prisma.training.aggregate({
        where: { offerId: id, orgId },
        _count: true,
        _sum: { finalPrice: true, discountAmount: true },
      }),
    ]);

    const membershipRevenue = memberships._sum.finalPrice || 0;
    const trainingRevenue = trainings._sum.finalPrice || 0;
    const membershipDiscount = memberships._sum.discountAmount || 0;
    const trainingDiscount = trainings._sum.discountAmount || 0;

    return {
      memberships: { count: memberships._count, revenue: membershipRevenue, discountGiven: membershipDiscount },
      trainings: { count: trainings._count, revenue: trainingRevenue, discountGiven: trainingDiscount },
      totalUsage: memberships._count + trainings._count,
      totalRevenue: membershipRevenue + trainingRevenue,
      totalDiscountGiven: membershipDiscount + trainingDiscount,
    };
  }
}

module.exports = new OfferRepository();
