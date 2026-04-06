const { prisma } = require("../../../../../config/prisma.config");

class NotificationsRepository {
  async getSettings(orgId) {
    return prisma.orgNotificationSettings.findUnique({ where: { orgId } });
  }

  async upsertSettings(orgId, data) {
    return prisma.orgNotificationSettings.upsert({
      where: { orgId },
      update: data,
      create: { orgId, ...data },
    });
  }

  /**
   * Members whose active membership ends within `days` days from now.
   */
  async getMembersExpiringSoon(orgId, days) {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() + days);

    return prisma.membership.findMany({
      where: {
        orgId,
        status: "active",
        endDate: { gte: now, lte: cutoff },
      },
      include: {
        member: { select: { firstName: true, lastName: true, phone: true, whatsappOptedIn: true } },
        planVariant: { include: { planType: { select: { name: true } } } },
      },
      orderBy: { endDate: "asc" },
    });
  }

  /**
   * Members whose membership expired in the last `days` days.
   */
  async getMembersExpiredRecently(orgId, days) {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    return prisma.membership.findMany({
      where: {
        orgId,
        status: "expired",
        endDate: { gte: cutoff, lte: now },
      },
      include: {
        member: { select: { firstName: true, lastName: true, phone: true, whatsappOptedIn: true } },
        planVariant: { include: { planType: { select: { name: true } } } },
      },
      orderBy: { endDate: "desc" },
    });
  }

  /**
   * Members with pending payments older than `days` days.
   */
  async getMembersWithPendingDues(orgId, days) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return prisma.payment.findMany({
      where: {
        orgId,
        status: "pending",
        createdAt: { lte: cutoff },
      },
      include: {
        member: { select: { firstName: true, lastName: true, phone: true, whatsappOptedIn: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }
}

module.exports = new NotificationsRepository();
