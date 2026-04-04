const { prisma } = require("../../../../../config/prisma.config");

class PlatformRepository {
  async listOrgs() {
    return await prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            members: true,
            trainers: true,
            planTypes: true,
          },
        },
      },
    });
  }

  async getOrgById(orgId) {
    return await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        _count: {
          select: {
            members: true,
            trainers: true,
            planTypes: true,
          },
        },
      },
    });
  }

  async createOrg(data) {
    return await prisma.organization.create({ data });
  }

  async updateOrg(orgId, data) {
    return await prisma.organization.update({
      where: { id: orgId },
      data,
    });
  }

  async setOrgActive(orgId, isActive) {
    return await prisma.organization.update({
      where: { id: orgId },
      data: { isActive },
    });
  }

  /**
   * Hard-deletes all org data in FK-safe order inside a transaction,
   * then deletes the org record itself.
   */
  async deleteOrgData(orgId) {
    await prisma.$transaction(async (tx) => {
      // Clear self-referential member references
      await tx.member.updateMany({ where: { orgId }, data: { referredById: null } });

      // Clear offer FKs before deleting offers
      await tx.membership.updateMany({ where: { orgId }, data: { offerId: null } });
      await tx.training.updateMany({ where: { orgId }, data: { offerId: null } });

      // Delete leaf-level records first
      await tx.trainerPayout.deleteMany({ where: { orgId } });
      await tx.payment.deleteMany({ where: { member: { orgId } } });
      await tx.attendance.deleteMany({ where: { orgId } });
      await tx.training.deleteMany({ where: { orgId } });
      await tx.membership.deleteMany({ where: { orgId } });
      await tx.member.deleteMany({ where: { orgId } });
      await tx.trainer.deleteMany({ where: { orgId } });
      await tx.planType.deleteMany({ where: { orgId } }); // PlanVariants cascade
      await tx.offer.deleteMany({ where: { orgId } });
      await tx.expense.deleteMany({ where: { orgId } });
      await tx.investment.deleteMany({ where: { orgId } });
      await tx.orgNotificationSettings.deleteMany({ where: { orgId } });
      await tx.dailyActivitySnapshot.deleteMany({ where: { orgId } });
      await tx.organization.delete({ where: { id: orgId } });
    });
  }

  async getOrgStats(orgId) {
    const [totalMembers, activeMembers, revenueResult] = await Promise.all([
      prisma.member.count({ where: { orgId } }),
      prisma.member.count({ where: { orgId, isActive: true } }),
      prisma.payment.aggregate({
        where: {
          status: "paid",
          member: { orgId },
        },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalMembers,
      activeMembers,
      totalRevenue: revenueResult._sum.amount ?? 0,
    };
  }
}

module.exports = new PlatformRepository();
