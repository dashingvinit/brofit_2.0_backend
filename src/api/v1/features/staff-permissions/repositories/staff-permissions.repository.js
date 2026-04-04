const { prisma } = require("../../../../../config/prisma.config");

const DEFAULTS = {
  canTakeAttendance: true,
  canRegisterMember: false,
  canCreateMembership: false,
  canCreateTraining: false,
  canRecordPayment: false,
  canViewMembers: true,
  canViewReports: false,
};

class StaffPermissionsRepository {
  async get(orgId) {
    return prisma.orgStaffPermissions.findUnique({ where: { orgId } });
  }

  async upsert(orgId, data) {
    return prisma.orgStaffPermissions.upsert({
      where: { orgId },
      update: data,
      create: { orgId, ...DEFAULTS, ...data },
    });
  }
}

module.exports = new StaffPermissionsRepository();
module.exports.DEFAULTS = DEFAULTS;
